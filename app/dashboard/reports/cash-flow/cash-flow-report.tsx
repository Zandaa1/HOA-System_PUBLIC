'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar, Settings2, Download, Printer } from 'lucide-react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ExcelJS from 'exceljs'

interface BankAccountItem {
  id: string
  name: string
  type: string
  account_number?: string | null
}

interface BankBalanceItem {
  bank_account_id: string
  period_month: number
  period_year: number
  beginning_balance: number
  ending_balance: number
}

interface Props {
  payments: any[]
  nonInvoiceCollections: any[]
  disbursements: any[]
  accountTransfers: any[]
  bankAccounts: BankAccountItem[]
  bankBalances: BankBalanceItem[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getPeriodByMonth(m: number) {
  if (m >= 0 && m <= 2) return 'Q1'
  if (m >= 3 && m <= 5) return 'Q2'
  if (m >= 6 && m <= 8) return 'Q3'
  return 'Q4'
}

export function CashFlowReport({
  payments,
  nonInvoiceCollections,
  disbursements,
  accountTransfers,
  bankAccounts,
  bankBalances,
}: Props) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)

  useEffect(() => {
    async function loadBranding() {
      const supabase = createClient()
      const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
      if (settings) setBranding(getBranding(settings))
    }
    loadBranding()
  }, [])

  const [viewType, setViewType] = useState<'monthly' | 'quarterly' | 'ytd'>('monthly')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedMonth, setSelectedMonth] = useState('4')
  const [selectedQuarter, setSelectedQuarter] = useState('1')

  // Starting balances per bank account (keyed by id)
  const [showSettings, setShowSettings] = useState(false)
  const [initialBalances, setInitialBalances] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const ba of bankAccounts) init[ba.id] = 0
    return init
  })

  const bankIdToName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const ba of bankAccounts) m[ba.id] = ba.name
    return m
  }, [bankAccounts])

  // Validate bank_balances chain
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    for (const ba of bankAccounts) {
      const acctBalances = bankBalances
        .filter(b => b.bank_account_id === ba.id)
        .sort((a, b) => a.period_year - b.period_year || a.period_month - b.period_month)
      for (let i = 1; i < acctBalances.length; i++) {
        if (acctBalances[i].beginning_balance !== acctBalances[i - 1].ending_balance) {
          errors.push(
            `${ba.name}: ${MONTHS[acctBalances[i].period_month - 1]} ${acctBalances[i].period_year} beginning (${acctBalances[i].beginning_balance}) ≠ ${MONTHS[acctBalances[i - 1].period_month - 1]} ${acctBalances[i - 1].period_year} ending (${acctBalances[i - 1].ending_balance})`
          )
        }
      }
    }
    return errors
  }, [bankBalances, bankAccounts])

  const normalizeBankId = useCallback((bankAccountId: string | null): string => {
    if (bankAccountId) return bankAccountId
    return bankAccounts[0]?.id || ''
  }, [bankAccounts])

  // Get the bank key for a given account name
  const getBankKey = useCallback((accountName: string): string => {
    return accountName
  }, [])

  // Report interval
  const reportInterval = useMemo(() => {
    const year = parseInt(selectedYear)
    let start: Date, end: Date, label = ''
    if (viewType === 'monthly') {
      const month = parseInt(selectedMonth)
      start = new Date(year, month, 1)
      end = new Date(year, month + 1, 0)
      label = start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    } else if (viewType === 'quarterly') {
      const q = parseInt(selectedQuarter)
      start = new Date(year, q * 3, 1)
      end = new Date(year, (q + 1) * 3, 0)
      label = `Q${q + 1} ${year}`
    } else {
      start = new Date(year, 0, 1)
      end = new Date(year, 12, 0)
      label = `YTD ${year}`
    }
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    return { startDate: fmt(start), endDate: fmt(end), label }
  }, [viewType, selectedYear, selectedMonth, selectedQuarter])

  // Compute report data
  const reportData = useMemo(() => {
    const { startDate, endDate } = reportInterval

    // Helper to create a zeroed bank map
    const zeroBank = () => {
      const m: Record<string, number> = {}
      for (const b of bankAccounts) m[b.id] = 0
      return m
    }

    // Historic rollforward
    const histIn = zeroBank()
    const histOut = zeroBank()

    payments.forEach((p: any) => {
      if (p.payment_date < startDate) {
        const key = normalizeBankId(p.bank_account_id)
        histIn[key] += Number(p.amount)
      }
    })
    nonInvoiceCollections.forEach((c: any) => {
      if (c.payment_date < startDate) {
        const key = normalizeBankId(c.bank_account_id)
        histIn[key] += Number(c.amount)
      }
    })
    disbursements.forEach((d: any) => {
      if (d.payment_date < startDate) {
        const key = normalizeBankId(d.bank_account_id)
        histOut[key] += Number(d.amount)
      }
    })
    accountTransfers.forEach((t: any) => {
      if (t.transfer_date < startDate) {
        const sourceKey = normalizeBankId(t.source_bank_account_id)
        const destinationKey = normalizeBankId(t.destination_bank_account_id)
        histOut[sourceKey] += Number(t.amount)
        histIn[destinationKey] += Number(t.amount)
      }
    })

    // Beginning balances
    const beginning: Record<string, number> = {}
    for (const b of bankAccounts) {
      beginning[b.id] = (initialBalances[b.id] || 0) + histIn[b.id] - histOut[b.id]
    }

    // Current period data
    const currentPayments = payments.filter((p: any) => p.payment_date >= startDate && p.payment_date <= endDate)
    const currentNic = nonInvoiceCollections.filter((c: any) => c.payment_date >= startDate && c.payment_date <= endDate)
    const currentDisb = disbursements.filter((d: any) => d.payment_date >= startDate && d.payment_date <= endDate)
    const currentTransfers = accountTransfers.filter((t: any) => t.transfer_date >= startDate && t.transfer_date <= endDate)

    // Collection categories (same as before but per bank ID)
    const collectionCats = [
      'dues', 'securityDues', 'membership', 'bond', 'constFee',
      'stickers', 'tennis', 'permit', 'interest',
    ] as const
    type ColCat = typeof collectionCats[number]

    const collections: Record<ColCat, Record<string, number>> = {} as any
    for (const cat of collectionCats) {
      collections[cat] = zeroBank()
    }

    // Allocate payments
    currentPayments.forEach((p: any) => {
      const bankKey = normalizeBankId(p.bank_account_id)
      const items = p.invoice?.invoice_items || []
      if (items.length === 0) {
        collections.dues[bankKey] += Number(p.amount)
        return
      }
      const totalItemAmt = items.reduce((s: number, it: any) => s + Number(it.amount), 0)
      items.forEach((item: any) => {
        const ratio = totalItemAmt > 0 ? Number(item.amount) / totalItemAmt : 1 / items.length
        const allocated = Number(p.amount) * ratio
        const feeName = (item.fee_type?.name || item.description || '').toLowerCase()
        let cat: ColCat = 'permit'
        if (feeName.includes('dues')) cat = 'dues'
        else if (feeName.includes('security dues')) cat = 'securityDues'
        else if (feeName.includes('membership')) cat = 'membership'
        else if (feeName.includes('bond') && !feeName.includes('refund')) cat = 'bond'
        else if (feeName.includes('construction')) cat = 'constFee'
        else if (feeName.includes('sticker') || feeName.includes('vehicle')) cat = 'stickers'
        else if (feeName.includes('tennis') || feeName.includes('court') || feeName.includes('amenity')) cat = 'tennis'
        else if (feeName.includes('permit') || feeName.includes('rental') || feeName.includes('violation')) cat = 'permit'
        collections[cat][bankKey] += allocated
      })
    })

    // Allocate non-invoice collections
    currentNic.forEach((c: any) => {
      const bankKey = normalizeBankId(c.bank_account_id)
      const catName = c.category.toLowerCase()
      if (catName.includes('transfer')) return
      let cat: ColCat = 'permit'
      if (catName.includes('interest')) cat = 'interest'
      collections[cat][bankKey] += Number(c.amount)
    })

    const totalCollections = zeroBank()
    for (const cat of collectionCats) {
      for (const b of bankAccounts) totalCollections[b.id] += collections[cat][b.id]
    }

    // Disbursements
    const disbursementCats = ['Utility', 'Transportation', 'Salary', 'Representation', 'Repairs', 'Bond Refund', 'Supplies', 'Legal', 'Security', 'Transfer', 'Other']
    const disbursementsBuckets: Record<string, Record<string, number>> = {}
    for (const cat of disbursementCats) disbursementsBuckets[cat] = zeroBank()

    currentDisb.forEach((d: any) => {
      const bankKey = normalizeBankId(d.bank_account_id)
      let cat = d.category
      // Map new snake_case to display category
      const categoryMap: Record<string, string> = {
        utility: 'Utility',
        salary: 'Salary',
        repairs: 'Repairs',
        security: 'Security',
        supplies: 'Supplies',
        legal: 'Legal',
        refund_bond: 'Bond Refund',
        transfer: 'Transfer',
        others: 'Other',
      }
      cat = categoryMap[cat.toLowerCase()] || cat
      if (!disbursementsBuckets[cat]) disbursementsBuckets['Other'] = zeroBank()
      disbursementsBuckets[cat][bankKey] += Number(d.amount)
    })

    const totalDisbursements = zeroBank()
    for (const cat of disbursementCats) {
      for (const b of bankAccounts) totalDisbursements[b.id] += disbursementsBuckets[cat][b.id]
    }

    const transferIn = zeroBank()
    const transferOut = zeroBank()
    currentTransfers.forEach((t: any) => {
      transferOut[normalizeBankId(t.source_bank_account_id)] += Number(t.amount)
      transferIn[normalizeBankId(t.destination_bank_account_id)] += Number(t.amount)
    })

    // Ending balances
    const ending: Record<string, number> = {}
    let endingTotal = 0
    for (const b of bankAccounts) {
      ending[b.id] = beginning[b.id] + totalCollections[b.id] - totalDisbursements[b.id] + transferIn[b.id] - transferOut[b.id]
      endingTotal += ending[b.id]
    }
    const beginningTotal = Object.values(beginning).reduce((s, v) => s + v, 0)
    const totalCollected = Object.values(totalCollections).reduce((s, v) => s + v, 0)
    const totalDisbursed = Object.values(totalDisbursements).reduce((s, v) => s + v, 0)

    // Refundable bonds
    let totalBondsCollected = 0, totalBondsRefunded = 0
    payments.forEach((p: any) => {
      const items = p.invoice?.invoice_items || []
      const totalItemAmt = items.reduce((s: number, it: any) => s + Number(it.amount), 0)
      items.forEach((item: any) => {
        const feeName = (item.fee_type?.name || item.description || '').toLowerCase()
        if (feeName.includes('bond')) {
          const ratio = totalItemAmt > 0 ? Number(item.amount) / totalItemAmt : 1 / items.length
          totalBondsCollected += Number(p.amount) * ratio
        }
      })
    })
    disbursements.forEach((d: any) => {
      const cat = (d.category || '').toLowerCase()
      if (cat === 'refund_bond' || cat === 'bond refund') totalBondsRefunded += Number(d.amount)
    })
    const refundableBonds = Math.max(0, totalBondsCollected - totalBondsRefunded)
    const cashAvailable = Math.max(0, endingTotal - refundableBonds)

    return {
      bankAccounts,
      beginning,
      beginningTotal,
      collections,
      totalCollections,
      collectionsTotal: totalCollected,
      disbursements: disbursementsBuckets,
      totalDisbursements,
      disbursementsTotal: totalDisbursed,
      transferIn,
      transferOut,
      ending,
      endingTotal,
      refundableBonds,
      cashAvailable,
    }
  }, [payments, nonInvoiceCollections, disbursements, accountTransfers, bankAccounts, bankIdToName, normalizeBankId, getBankKey, reportInterval, initialBalances])

  const fmt = (n: number) => {
    if (n === 0) return ' -   '
    return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handlePrint = () => window.print()

  // Excel export using exceljs
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const year = selectedYear
    const categories = [
      { key: 'dues', label: 'Association Dues' },
      { key: 'securityDues', label: 'Security Dues' },
      { key: 'membership', label: 'Membership Fee' },
      { key: 'bond', label: 'Construction Bond (Refundable)' },
      { key: 'constFee', label: 'Construction Fee etc' },
      { key: 'stickers', label: 'Car/Truck Stickers' },
      { key: 'tennis', label: 'Tennis Court Fees' },
      { key: 'permit', label: 'Permit, Open Space rental etc' },
      { key: 'interest', label: 'Bank Interest (Net)' },
    ]
    const disbCategories = ['Utility', 'Transportation', 'Salary', 'Representation', 'Repairs', 'Bond Refund', 'Supplies', 'Legal', 'Security', 'Transfer', 'Other']

    // Helper to get monthly data for bank (by ID)
    const getMonthlyCollection = (bankId: string, bankName: string, catKey: string, month: number, year: number) => {
      const ms = String(month).padStart(2, '0')
      const start = `${year}-${ms}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]
      const periodPayments = payments.filter((p: any) => p.payment_date >= start && p.payment_date <= end)
      const periodNic = nonInvoiceCollections.filter((c: any) => c.payment_date >= start && c.payment_date <= end)
      let total = 0

      // Map payments
      periodPayments.forEach((p: any) => {
        const bid = normalizeBankId(p.bank_account_id)
        if (bid !== bankId) return
        const items = p.invoice?.invoice_items || []
        if (items.length === 0 && catKey === 'dues') { total += Number(p.amount); return }
        const totalItemAmt = items.reduce((s: number, it: any) => s + Number(it.amount), 0)
        items.forEach((item: any) => {
          const ratio = totalItemAmt > 0 ? Number(item.amount) / totalItemAmt : 1 / items.length
          const allocated = Number(p.amount) * ratio
          const feeName = (item.fee_type?.name || item.description || '').toLowerCase()
          const keyMap: Record<string, string> = {
            dues: 'dues', 'security dues': 'securityDues', membership: 'membership',
            bond: 'bond', construction: 'constFee',
            sticker: 'stickers', vehicle: 'stickers',
            tennis: 'tennis', court: 'tennis', amenity: 'tennis',
            permit: 'permit', rental: 'permit', violation: 'permit',
          }
          const match = Object.entries(keyMap).find(([k]) => feeName.includes(k))
          if (match && match[1] === catKey) total += allocated
          if (!match && catKey === 'permit') total += allocated
        })
      })

      // Map non-invoice collections
      periodNic.forEach((c: any) => {
        const bid = normalizeBankId(c.bank_account_id)
        if (bid !== bankId) return
        const catName = c.category.toLowerCase()
        if (catName.includes('transfer')) return
        if (catKey === 'interest' && catName.includes('interest')) total += Number(c.amount)
      })

      return total
    }

    const getMonthlyDisbursement = (bankId: string, bankName: string, cat: string, month: number, year: number) => {
      const ms = String(month).padStart(2, '0')
      const start = `${year}-${ms}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]
      const catMap: Record<string, string> = {
        utility: 'Utility', salary: 'Salary', repairs: 'Repairs',
        security: 'Security', supplies: 'Supplies', legal: 'Legal',
        refund_bond: 'Bond Refund', transfer: 'Transfer', others: 'Other',
      }
      return disbursements
        .filter((d: any) => {
          const dCat = catMap[d.category?.toLowerCase()] || d.category
          const bid = normalizeBankId(d.bank_account_id)
          return dCat === cat && bid === bankId && d.payment_date >= start && d.payment_date <= end
        })
        .reduce((s: number, d: any) => s + Number(d.amount), 0)
    }

    // Create per-bank sheet
    const usedSheetNames = new Set<string>()
    for (const ba of bankAccounts) {
      let sheetName = `${ba.name}_${ba.account_number || ba.id.substring(0, 8)}`.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
      while (usedSheetNames.has(sheetName)) {
        sheetName = sheetName.substring(0, 26) + '_' + Math.random().toString(36).substring(2, 5)
      }
      usedSheetNames.add(sheetName)
      const sheet = workbook.addWorksheet(sheetName)
      sheet.columns = [
        { header: 'Category', key: 'category', width: 35 },
        ...Array.from({ length: 12 }, (_, i) => ({ header: MONTHS[i].substring(0, 3), key: `m${i}`, width: 14 })),
        { header: 'Q1', key: 'q1', width: 14 },
        { header: 'Q2', key: 'q2', width: 14 },
        { header: 'Q3', key: 'q3', width: 14 },
        { header: 'Q4', key: 'q4', width: 14 },
        { header: 'YTD', key: 'ytd', width: 14 },
      ]

      // Get beginning balance data
      const getMonthlyBeginning = (month: number) => {
        const bal = bankBalances.find(b => b.bank_account_id === ba.id && b.period_month === month && b.period_year === parseInt(year))
        return bal?.beginning_balance || 0
      }
      const getMonthlyEnding = (month: number) => {
        const bal = bankBalances.find(b => b.bank_account_id === ba.id && b.period_month === month && b.period_year === parseInt(year))
        return bal?.ending_balance || 0
      }

      const monthlyData = (catKey: string, getter: (bankId: string, bank: string, cat: string, m: number, y: number) => number) => {
        return Array.from({ length: 12 }, (_, i) => getter(ba.id, ba.name, catKey, i + 1, parseInt(year)))
      }
      const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)
      const qSum = (arr: number[], q: number) => sum(arr.slice(q * 3, q * 3 + 3))

      // Add title row
      sheet.mergeCells('A1:N1')
      const titleCell = sheet.getCell('A1')
      titleCell.value = `${branding.hoaName.toUpperCase()} - ${ba.name}`
      titleCell.font = { bold: true, size: 14 }
      sheet.mergeCells('A2:N2')
      sheet.getCell('A2').value = `Statement of Cash Flows - For the year ended December 31, ${year}`
      sheet.getCell('A2').font = { italic: true }

      // Beginning balance row
      let row = 4
      sheet.getCell(`A${row}`).value = 'Cash, beginning balance'
      sheet.getCell(`A${row}`).font = { bold: true }
      const begMonthly = Array.from({ length: 12 }, (_, i) => getMonthlyBeginning(i + 1))
      begMonthly.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
      ;[0, 1, 2, 3].forEach((q) => {
        sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(begMonthly, q)
      })
      sheet.getCell('N' + row).value = sum(begMonthly)

      row += 2
      sheet.getCell(`A${row}`).value = 'Add: Collections'
      sheet.getCell(`A${row}`).font = { bold: true, italic: true }

      // Collection rows
      for (const cat of categories) {
        row++
        const data = monthlyData(cat.key, getMonthlyCollection)
        sheet.getCell(`A${row}`).value = cat.label
        data.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
        ;[0, 1, 2, 3].forEach((q) => {
          sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(data, q)
        })
        sheet.getCell('N' + row).value = sum(data)
      }

      row++
      const totalColData = Array.from({ length: 12 }, (_, i) => {
        return categories.reduce((s, cat) => s + getMonthlyCollection(ba.id, ba.name, cat.key, i + 1, parseInt(year)), 0)
      })
      sheet.getCell(`A${row}`).value = 'Total Collections'
      sheet.getCell(`A${row}`).font = { bold: true }
      totalColData.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
      ;[0, 1, 2, 3].forEach((q) => {
        sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(totalColData, q)
      })
      sheet.getCell('N' + row).value = sum(totalColData)

      // Disbursements section
      row += 2
      sheet.getCell(`A${row}`).value = 'Less: Disbursements'
      sheet.getCell(`A${row}`).font = { bold: true, italic: true }

      for (const cat of disbCategories) {
        row++
        const data = monthlyData(cat, getMonthlyDisbursement)
        sheet.getCell(`A${row}`).value = cat
        data.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
        ;[0, 1, 2, 3].forEach((q) => {
          sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(data, q)
        })
        sheet.getCell('N' + row).value = sum(data)
      }

      row++
      const totalDisbData = Array.from({ length: 12 }, (_, i) => {
        return disbCategories.reduce((s, cat) => s + getMonthlyDisbursement(ba.id, ba.name, cat, i + 1, parseInt(year)), 0)
      })
      sheet.getCell(`A${row}`).value = 'Total Disbursements'
      sheet.getCell(`A${row}`).font = { bold: true }
      totalDisbData.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
      ;[0, 1, 2, 3].forEach((q) => {
        sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(totalDisbData, q)
      })
      sheet.getCell('N' + row).value = sum(totalDisbData)

      // Ending balance
      row += 2
      sheet.getCell(`A${row}`).value = 'Cash, ending balance'
      sheet.getCell(`A${row}`).font = { bold: true }
      const endMonthly = Array.from({ length: 12 }, (_, i) => getMonthlyEnding(i + 1))
      endMonthly.forEach((v, i) => { sheet.getCell(String.fromCharCode(66 + i) + row).value = v })
      ;[0, 1, 2, 3].forEach((q) => {
        sheet.getCell(String.fromCharCode(78 + q) + row).value = qSum(endMonthly, q)
      })
      sheet.getCell('N' + row).value = sum(endMonthly)
    }

    // Consolidated sheet
    const consSheet = workbook.addWorksheet('Consolidated')
    consSheet.columns = [
      { header: 'Category', key: 'category', width: 35 },
      ...Array.from({ length: 12 }, (_, i) => ({ header: MONTHS[i].substring(0, 3), key: `m${i}`, width: 14 })),
      { header: 'Q1', key: 'q1', width: 14 },
      { header: 'Q2', key: 'q2', width: 14 },
      { header: 'Q3', key: 'q3', width: 14 },
      { header: 'Q4', key: 'q4', width: 14 },
      { header: 'YTD', key: 'ytd', width: 14 },
    ]

    consSheet.mergeCells('A1:N1')
    consSheet.getCell('A1').value = `${branding.hoaName.toUpperCase()} - CONSOLIDATED`
    consSheet.getCell('A1').font = { bold: true, size: 14 }
    consSheet.mergeCells('A2:N2')
    consSheet.getCell('A2').value = `Statement of Cash Flows - For the year ended December 31, ${year}`
    consSheet.getCell('A2').font = { italic: true }
    consSheet.mergeCells('A3:N3')
    consSheet.getCell('A3').value = 'Note: Transfer from other Acct not included in Receipts or Disbursements per BIR report'

    // Read from per-bank sheets and sum
    let rowOffset = 5
    const sumAcrossBanks = (catLabel: string, month: number, yearNum: number, type: 'collection' | 'disbursement' | 'beginning' | 'ending') => {
      let total = 0
      for (const ba of bankAccounts) {
        if (type === 'beginning') {
          const bal = bankBalances.find(b => b.bank_account_id === ba.id && b.period_month === month && b.period_year === yearNum)
          total += bal?.beginning_balance || 0
        } else if (type === 'ending') {
          const bal = bankBalances.find(b => b.bank_account_id === ba.id && b.period_month === month && b.period_year === yearNum)
          total += bal?.ending_balance || 0
        } else if (type === 'collection') {
          total += getMonthlyCollection(ba.id, ba.name, catLabel, month, yearNum)
        } else {
          total += getMonthlyDisbursement(ba.id, ba.name, catLabel, month, yearNum)
        }
      }
      return total
    }

    // Beginning
    consSheet.getCell(`A${rowOffset}`).value = 'Cash, beginning balance'
    consSheet.getCell(`A${rowOffset}`).font = { bold: true }
    for (let m = 1; m <= 12; m++) {
      consSheet.getCell(String.fromCharCode(65 + m) + rowOffset).value = sumAcrossBanks('', m, parseInt(year), 'beginning')
    }

    rowOffset += 2
    consSheet.getCell(`A${rowOffset}`).value = 'Add: Collections'
    consSheet.getCell(`A${rowOffset}`).font = { bold: true, italic: true }

    for (const cat of categories) {
      rowOffset++
      consSheet.getCell(`A${rowOffset}`).value = cat.label
      for (let m = 1; m <= 12; m++) {
        consSheet.getCell(String.fromCharCode(65 + m) + rowOffset).value = sumAcrossBanks(cat.key, m, parseInt(year), 'collection')
      }
    }

    rowOffset += 2
    consSheet.getCell(`A${rowOffset}`).value = 'Less: Disbursements'
    consSheet.getCell(`A${rowOffset}`).font = { bold: true, italic: true }

    for (const cat of disbCategories) {
      rowOffset++
      consSheet.getCell(`A${rowOffset}`).value = cat
      for (let m = 1; m <= 12; m++) {
        consSheet.getCell(String.fromCharCode(65 + m) + rowOffset).value = sumAcrossBanks(cat, m, parseInt(year), 'disbursement')
      }
    }

    rowOffset += 2
    consSheet.getCell(`A${rowOffset}`).value = 'Cash, ending balance'
    consSheet.getCell(`A${rowOffset}`).font = { bold: true }
    for (let m = 1; m <= 12; m++) {
      consSheet.getCell(String.fromCharCode(65 + m) + rowOffset).value = sumAcrossBanks('', m, parseInt(year), 'ending')
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Cash_Flow_${year}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

    const collectionCats = [
      { key: 'dues', label: 'Association Dues' },
    { key: 'securityDues', label: 'Security Dues' },
    { key: 'membership', label: 'Membership Fee' },
    { key: 'bond', label: 'Construction Bond (Refundable)' },
    { key: 'constFee', label: 'Construction Fee etc' },
      { key: 'stickers', label: 'Car/Truck Stickers' },
      { key: 'tennis', label: 'Tennis Court Fees' },
      { key: 'permit', label: 'Permit, Open Space rental etc' },
      { key: 'interest', label: 'Bank Interest (Net)' },
    ]

  const disbursementLabels: Record<string, string> = {
    Utility: 'Utility',
    Transportation: 'Transportation',
    Salary: 'Salary & Other Benefits',
    Representation: 'Representation',
    Repairs: 'Repairs & Maintenance',
    'Bond Refund': 'Refund of Construction Bond',
    Supplies: 'Supplies',
    Legal: 'Legal',
    Security: 'Security',
    Transfer: 'Transfer',
    Other: 'Other',
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Print Styles Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter landscape;
            margin: 8mm 8mm;
          }
          body, html {
            background-color: #ffffff !important;
            color: #020617 !important;
            font-family: var(--font-sans), system-ui, sans-serif !important;
          }
          /* Convert flex layout wrapper to block to prevent column spaces on print */
          .group\\/sidebar-wrapper {
            display: block !important;
          }
          /* Clear layout restrictions and hide sidebar/gaps/headers completely */
          aside,
          .peer,
          [data-slot="sidebar"],
          [data-slot="sidebar-gap"],
          [data-slot="sidebar-container"],
          [data-sidebar="sidebar"],
          header,
          nav,
          .print\\:hidden {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          main,
          [data-slot="sidebar-inset"] {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            height: auto !important;
          }
          /* Ledger print optimization */
          .print-card-border {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            break-inside: avoid !important;
          }
          th, td {
            padding: 2px 4px !important;
            font-size: 7.5px !important;
            border-bottom: 1px solid #cbd5e1 !important; /* slate-300 */
          }
          /* Professional accounting double underline */
          .print-double-underline {
            border-bottom: 4px double #020617 !important;
            background-color: transparent !important;
          }
        }
      ` }} />

      {validationErrors.length > 0 && (
        <Card className="border-status-pending-border bg-status-pending-bg/50 print:hidden">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Bank balance chain validation errors</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc pl-4">
                  {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control / Toolbar Deck - Hidden on Print */}
      <Card className="print:hidden border-slate-200/80 shadow-sm bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Report View</span>
                <Select value={viewType} onValueChange={(val: any) => setViewType(val)}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Fiscal Year</span>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {viewType === 'monthly' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Month</span>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {new Date(2026, i, 1).toLocaleDateString('en-PH', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {viewType === 'quarterly' && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Quarter</span>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">1st Quarter</SelectItem>
                      <SelectItem value="1">2nd Quarter</SelectItem>
                      <SelectItem value="2">3rd Quarter</SelectItem>
                      <SelectItem value="3">4th Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className={`h-9 text-xs gap-1.5 transition-colors ${showSettings ? 'bg-slate-100 border-slate-300 font-semibold' : ''}`}
              >
                <Settings2 className="size-3.5 text-slate-500" />
                Starting Balances
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 text-xs gap-1.5">
                      <Download className="size-3.5 text-slate-500" />
                      Export Excel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exports full annual layout with per-bank and consolidated sheets</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 text-xs gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-semibold">
                <Printer className="size-3.5" />
                Print PDF
              </Button>
            </div>
          </div>

          {/* Starting Balances Collapsible Form */}
          {showSettings && (
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 grid gap-4 sm:grid-cols-3 motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:duration-200">
              {bankAccounts.map((ba) => (
                <div key={ba.id} className="space-y-1.5">
                  <Label htmlFor={`init-${ba.id}`} className="text-xs font-semibold text-slate-600">{ba.name} Opening Balance (Jan 1, {selectedYear})</Label>
                  <Input
                    id={`init-${ba.id}`}
                    type="number"
                    value={initialBalances[ba.id] || 0}
                    onChange={(e) => setInitialBalances({ ...initialBalances, [ba.id]: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Statement Ledger */}
      <Card className="print-card-border shadow-sm border-slate-200/80 bg-white">
        {/* On-Screen Header - Hidden on Print */}
        <CardHeader className="border-b border-slate-100 pb-5 print:hidden">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono block">{branding.hoaFullName} HOA</span>
              <CardTitle className="text-xl font-bold tracking-tight text-slate-900 mt-1">Statement of Cash Flows</CardTitle>
              <CardDescription className="text-xs font-mono text-slate-500 mt-1.5 flex items-center gap-1.5">
                <Calendar className="size-3 text-slate-400" />
                For the period ending: <span className="font-semibold text-slate-700">{reportInterval.label}</span>
              </CardDescription>
            </div>

          </div>
        </CardHeader>

        {/* Print-Only Letterhead - Hidden on Screen */}
        <div className="hidden print:block text-center border-b-2 border-double border-slate-900 pb-5 mb-6">
          <h1 className="text-lg font-bold tracking-wider uppercase font-sans text-slate-900">{branding.hoaFullName}</h1>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-0.5 font-medium">Homeowners Association, Inc.</p>
          <p className="text-[9px] text-slate-500 mt-0.5 font-mono">{branding.hoaAddress}</p>
          <div className="mt-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Statement of Cash Flows</h2>
            <p className="text-xs font-mono text-slate-700 mt-1">Report Period: {reportInterval.label}</p>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto print:overflow-visible">
            <Table className="border-collapse w-full print:min-w-0"
              style={{ fontSize: `clamp(7.5px, ${Math.max(7.5, 13 - bankAccounts.length * 0.8)}px, 13px)` }}>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50/50 border-b border-slate-200">
                  <TableHead className="font-semibold text-slate-600 uppercase tracking-wider py-2 w-0 min-w-0">Category</TableHead>
                  {reportData.bankAccounts.map((ba) => (
                    <TableHead key={ba.id} className="text-right font-semibold text-slate-600 uppercase tracking-wider py-2" style={{ paddingLeft: 'max(4px, 0.5em)', paddingRight: 'max(4px, 0.5em)' }}>{ba.name}</TableHead>
                  ))}
                  <TableHead className="text-right font-semibold text-slate-900 uppercase tracking-wider py-2 bg-slate-100/50" style={{ paddingLeft: 'max(4px, 0.5em)', paddingRight: 'max(4px, 0.5em)' }}>Consolidated Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Beginning Cash Row */}
                <TableRow className="font-bold bg-slate-50/30 hover:bg-slate-55 border-b border-slate-200">
                  <TableCell className="font-semibold text-slate-800 py-2">Cash, beginning balance</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono text-slate-900 py-2">{fmt(reportData.beginning[ba.id])}</TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-primary font-bold py-2 bg-slate-50">{fmt(reportData.beginningTotal)}</TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="h-1 hover:bg-transparent"><TableCell colSpan={reportData.bankAccounts.length + 2} className="p-0 border-none"></TableCell></TableRow>
                
                {/* Collections Section */}
                <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-b border-slate-200">
                  <TableCell colSpan={reportData.bankAccounts.length + 2} className="font-bold uppercase tracking-wider text-slate-500 py-2 bg-slate-100/30">
                    Add: Collections
                  </TableCell>
                </TableRow>

                {collectionCats.map((cat) => (
                  <TableRow key={cat.key} className="hover:bg-slate-50/40 border-b border-slate-100">
                    <TableCell className="pl-6 text-slate-600 py-1.5">{cat.label}</TableCell>
                    {reportData.bankAccounts.map((ba) => (
                      <TableCell key={ba.id} className="text-right font-mono text-slate-700 py-1.5">
                        {fmt(reportData.collections[cat.key as keyof typeof reportData.collections]?.[ba.id] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-medium text-slate-900 py-1.5 bg-slate-50/30">
                      {fmt(Object.values(reportData.collections[cat.key as keyof typeof reportData.collections] || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0))}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className="font-bold bg-muted/30 border-b border-border text-foreground">
                  <TableCell className="pl-4 font-semibold text-foreground py-2">Total Collections</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono font-bold text-slate-800 py-2">{fmt(reportData.totalCollections[ba.id])}</TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-emerald-600 font-bold py-2 bg-slate-50">{fmt(reportData.collectionsTotal)}</TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="h-1 hover:bg-transparent"><TableCell colSpan={reportData.bankAccounts.length + 2} className="p-0 border-none"></TableCell></TableRow>
                
                {/* Disbursements Section */}
                <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-b border-slate-200">
                  <TableCell colSpan={reportData.bankAccounts.length + 2} className="font-bold uppercase tracking-wider text-slate-500 py-2 bg-slate-100/30">
                    Less: Disbursements
                  </TableCell>
                </TableRow>

                {Object.keys(reportData.disbursements).map((cat) => (
                  <TableRow key={cat} className="hover:bg-slate-50/40 border-b border-slate-100">
                    <TableCell className="pl-6 text-slate-600 py-1.5">{disbursementLabels[cat] || cat}</TableCell>
                    {reportData.bankAccounts.map((ba) => (
                      <TableCell key={ba.id} className="text-right font-mono text-slate-700 py-1.5">
                        {fmt(reportData.disbursements[cat]?.[ba.id] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono font-medium text-slate-900 py-1.5 bg-slate-50/30">
                      {fmt(Object.values(reportData.disbursements[cat] || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0))}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className="font-bold bg-muted/30 border-b border-border text-foreground">
                  <TableCell className="pl-4 font-semibold text-foreground py-2">Total Disbursements</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono font-bold text-slate-800 py-2">{fmt(reportData.totalDisbursements[ba.id])}</TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-rose-600 font-bold py-2 bg-slate-50">{fmt(reportData.disbursementsTotal)}</TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="h-1 hover:bg-transparent"><TableCell colSpan={reportData.bankAccounts.length + 2} className="p-0 border-none"></TableCell></TableRow>

                <TableRow className="bg-slate-50/40 hover:bg-slate-50/40 border-b border-slate-200">
                  <TableCell colSpan={reportData.bankAccounts.length + 2} className="font-bold uppercase tracking-wider text-slate-500 py-2 bg-slate-100/30">
                    Account Transfers
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/40 border-b border-slate-100">
                  <TableCell className="pl-6 text-slate-600 py-1.5">Transfer In</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono text-slate-700 py-1.5">
                      {fmt(reportData.transferIn[ba.id] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-slate-500 py-1.5 bg-slate-50/30"> -   </TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/40 border-b border-slate-100">
                  <TableCell className="pl-6 text-slate-600 py-1.5">Transfer Out</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono text-slate-700 py-1.5">
                      {fmt(reportData.transferOut[ba.id] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-slate-500 py-1.5 bg-slate-50/30"> -   </TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="h-1 hover:bg-transparent"><TableCell colSpan={reportData.bankAccounts.length + 2} className="p-0 border-none"></TableCell></TableRow>
                
                {/* Ending Balance */}
                <TableRow className="font-bold bg-muted border-t border-b-2 border-border text-foreground">
                  <TableCell className="font-semibold text-foreground py-2">Cash, ending balance</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono font-bold text-slate-900 py-2">{fmt(reportData.ending[ba.id])}</TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-slate-950 font-bold py-2 bg-slate-100/50">{fmt(reportData.endingTotal)}</TableCell>
                </TableRow>

                {/* Net Surplus / Deficit */}
                <TableRow className="font-semibold bg-slate-50/10 hover:bg-slate-50/20 border-b border-slate-200">
                  <TableCell className="font-medium italic text-slate-700 py-2">Net Surplus / (Deficit) for Period</TableCell>
                  {reportData.bankAccounts.map((ba) => (
                    <TableCell key={ba.id} className="text-right font-mono text-slate-800 py-2">
                      {fmt(reportData.totalCollections[ba.id] - reportData.totalDisbursements[ba.id])}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right font-mono font-bold py-2 bg-slate-50/30 ${(reportData.collectionsTotal - reportData.disbursementsTotal) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {fmt(reportData.collectionsTotal - reportData.disbursementsTotal)}
                  </TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="h-2 hover:bg-transparent"><TableCell colSpan={reportData.bankAccounts.length + 2} className="p-0 border-none"></TableCell></TableRow>

                {/* Rollforward and Available Cash Section (BIR aligned layout) */}
                <TableRow className="hover:bg-slate-50 border-t border-slate-200">
                  <TableCell colSpan={reportData.bankAccounts.length + 1} className="font-medium text-slate-600 pl-4 py-1.5">Cash ending balance (consolidated)</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-800 py-1.5">{fmt(reportData.endingTotal)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50 border-b border-slate-100">
                  <TableCell colSpan={reportData.bankAccounts.length + 1} className="text-slate-500 pl-6 italic py-1.5">Less: Refundable Construction Bonds in custody</TableCell>
                  <TableCell className="text-right font-mono text-rose-600 py-1.5">({fmt(reportData.refundableBonds)})</TableCell>
                </TableRow>
                <TableRow className="print-double-underline font-bold bg-primary/5 hover:bg-primary/5 text-primary text-sm border-b-4 border-double border-primary/40">
                  <TableCell colSpan={reportData.bankAccounts.length + 1} className="font-bold text-primary pl-4 py-2.5 print:text-slate-900">Cash Available for Use</TableCell>
                  <TableCell className="text-right font-mono font-bold text-primary py-2.5 bg-primary/5 print:text-slate-900 print:bg-transparent">{fmt(reportData.cashAvailable)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
