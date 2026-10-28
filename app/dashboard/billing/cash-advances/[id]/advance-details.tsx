'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Trash2,
  AlertCircle,
  Plus,
  CheckCircle,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { CashAdvance, AdvanceLiquidation, AdvanceReturn, BankAccount, SystemSetting } from '@/lib/types/database'
import { CASH_ADVANCE_STATUS_COLORS } from '@/lib/constants'
import { uploadAppFile } from '@/lib/storage/client'
import { getFileUrl } from '@/lib/storage/shared'

interface AdvanceDetailsProps {
  advance: CashAdvance
  liquidations: AdvanceLiquidation[]
  returns: AdvanceReturn[]
  bankAccounts: BankAccount[]
  settings?: SystemSetting[]
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  released: 'Released',
  partially_liquidated: 'Partially Liquidated',
  liquidated: 'Liquidated',
  cancelled: 'Cancelled',
}

const disbursementCategories = [
  { value: 'utility', label: 'Utility' },
  { value: 'transportation_equipment', label: 'Transportation & Equipment' },
  { value: 'salary', label: 'Salary & Other Benefits' },
  { value: 'representation', label: 'Representation' },
  { value: 'repairs', label: 'Repairs & Maintenance' },
  { value: 'refund_bond', label: 'Refund of Construction Bond' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'legal', label: 'Legal & Professional Fees' },
  { value: 'security', label: 'Security' },
  { value: 'others', label: 'Others' },
]

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

export function AdvanceDetails({ advance, liquidations, returns, bankAccounts, settings }: AdvanceDetailsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const settingsMap = (settings || []).reduce(
    (acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }),
    {} as Record<string, string | null>
  )
  const liquidationDeadlineDays = parseInt(settingsMap['cash_advance_liquidation_deadline_days'] || '30', 10)
  const approvalThreshold = parseFloat(settingsMap['cash_advance_approval_threshold'] || '10000')

  // Dialog & Sheet States
  const [approveOpen, setApproveOpen] = useState(false)
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [liquidateOpen, setLiquidateOpen] = useState(false)

  // Form states
  const [approveForm, setApproveForm] = useState({
    approved_amount: String(advance.requested_amount),
    approved_by: '',
    notes: '',
  })

  const [releaseForm, setReleaseForm] = useState({
    source_bank_account_id: advance.source_bank_account_id || '',
    released_amount: String(advance.approved_amount || advance.requested_amount),
    notes: '',
  })

  const [returnForm, setReturnForm] = useState({
    amount: '',
    return_method: 'cash' as 'cash' | 'bank_transfer' | 'gcash',
    reference_number: '',
    received_by: '',
    notes: '',
  })

  // Liquidation state: array of items
  const [liqItems, setLiqItems] = useState<Array<{
    category: string
    description: string
    receipt_date: string
    receipt_number: string
    amount: string
    file: File | null
  }>>([
    { category: 'supplies', description: '', receipt_date: new Date().toISOString().split('T')[0], receipt_number: '', amount: '', file: null }
  ])

  const handleAddLiqRow = () => {
    setLiqItems([...liqItems, { category: 'supplies', description: '', receipt_date: new Date().toISOString().split('T')[0], receipt_number: '', amount: '', file: null }])
  }

  const handleRemoveLiqRow = (idx: number) => {
    if (liqItems.length === 1) return
    setLiqItems(liqItems.filter((_, i) => i !== idx))
  }

  const handleLiqItemChange = (idx: number, field: string, val: any) => {
    const updated = [...liqItems]
    updated[idx] = { ...updated[idx], [field]: val }
    setLiqItems(updated)
  }

  const activeLiqTotal = liqItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  // Database Action updates
  const handleApprove = () => {
    const amount = parseFloat(approveForm.approved_amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid approved amount.')
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('cash_advances')
        .update({
          approved_amount: amount,
          approved_by: approveForm.approved_by.trim() || 'HOA Officer',
          status: 'approved',
          approved_at: new Date().toISOString(),
          notes: approveForm.notes.trim() || advance.notes,
        })
        .eq('id', advance.id)

      if (err) {
        setError(err.message)
        return
      }
      setApproveOpen(false)
      router.refresh()
    })
  }

  const handleRelease = () => {
    if (!releaseForm.source_bank_account_id) {
      setError('Please select a source bank account.')
      return
    }
    const amount = parseFloat(releaseForm.released_amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid released amount.')
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const now = new Date()
      const dueDate = new Date()
      dueDate.setDate(now.getDate() + liquidationDeadlineDays)

      // 1. Create disbursement release record
      const vouchNum = `VOUCH-${Date.now()}`
      const { data: disb, error: disbErr } = await supabase
        .from('disbursements')
        .insert({
          disbursement_number: vouchNum,
          category: 'others',
          amount,
          payment_date: now.toISOString().split('T')[0],
          payment_method: 'Cash',
          payee: advance.grantee_name,
          notes: `Cash Advance release for: ${advance.purpose}. Reference: ${advance.reference_number}`,
          bank_account_id: releaseForm.source_bank_account_id,
          cash_advance_id: advance.id,
          is_advance_release: true,
          period_month: now.getMonth() + 1,
          period_year: now.getFullYear(),
        })
        .select('id')
        .single()

      if (disbErr || !disb) {
        setError(disbErr?.message || 'Failed to create disbursement record.')
        return
      }

      // 2. Update cash advance
      const { error: updateErr } = await supabase
        .from('cash_advances')
        .update({
          released_amount: amount,
          released_at: now.toISOString(),
          due_liquidation_date: dueDate.toISOString().split('T')[0],
          status: 'released',
          source_bank_account_id: releaseForm.source_bank_account_id,
          release_disbursement_id: disb.id,
          notes: releaseForm.notes.trim() || advance.notes,
        })
        .eq('id', advance.id)

      if (updateErr) {
        setError(updateErr.message)
        return
      }

      setReleaseOpen(false)
      router.refresh()
    })
  }

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('cash_advances')
        .update({
          status: 'cancelled',
          closed_at: new Date().toISOString(),
        })
        .eq('id', advance.id)

      if (err) {
        setError(err.message)
        return
      }
      router.refresh()
    })
  }

  const handleRecordReturn = () => {
    const amount = parseFloat(returnForm.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid returned amount.')
      return
    }
    if (amount > Number(advance.outstanding_balance)) {
      setError(`Cannot return more than the outstanding balance of ${fmt(Number(advance.outstanding_balance))}`)
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const now = new Date()

      if (!advance.source_bank_account_id) {
        setError('Cannot record a return without a source bank account on the cash advance.')
        return
      }

      // 1. Insert into advance_returns
      const { error: retErr } = await supabase
        .from('advance_returns')
        .insert({
          cash_advance_id: advance.id,
          amount,
          return_method: returnForm.return_method,
          reference_number: returnForm.reference_number.trim() || null,
          returned_at: now.toISOString(),
          received_by: returnForm.received_by.trim() || 'HOA Treasurer',
          notes: returnForm.notes.trim() || null,
        })

      if (retErr) {
        setError(retErr.message)
        return
      }

      // 2. Log a non_invoice_collection to represent the cash return
      const receiptNum = `RET-${Date.now()}`
      const { error: collErr } = await supabase
        .from('non_invoice_collections')
        .insert({
          receipt_number: receiptNum,
          category: 'Other',
          amount,
          payment_date: now.toISOString().split('T')[0],
          payment_method: returnForm.return_method === 'cash' ? 'Cash' : 'Bank Transfer',
          bank_account_id: advance.source_bank_account_id,
          notes: `Return of unused cash advance: ${advance.reference_number}. Received by ${returnForm.received_by}`,
        })

      if (collErr) {
        setError(collErr.message)
        return
      }

      // 4. Update cash advance values
      const newReturned = Number(advance.returned_amount) + amount
      const newOutstanding = Number(advance.outstanding_balance) - amount
      const newStatus = newOutstanding <= 0 ? 'liquidated' : 'partially_liquidated'
      const closedAt = newOutstanding <= 0 ? now.toISOString() : null

      const { error: updateErr } = await supabase
        .from('cash_advances')
        .update({
          returned_amount: newReturned,
          status: newStatus,
          closed_at: closedAt,
        })
        .eq('id', advance.id)

      if (updateErr) {
        setError(updateErr.message)
        return
      }

      setReturnOpen(false)
      router.refresh()
    })
  }

  const handleSubmitLiquidation = () => {
    if (activeLiqTotal <= 0) {
      setError('Please add at least one liquidation row with an amount.')
      return
    }
    if (activeLiqTotal > Number(advance.outstanding_balance)) {
      setError(`Liquidation total (${fmt(activeLiqTotal)}) exceeds outstanding balance (${fmt(Number(advance.outstanding_balance))}).`)
      return
    }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const now = new Date()

      try {
        for (const item of liqItems) {
          const itemAmt = parseFloat(item.amount)
          if (isNaN(itemAmt) || itemAmt <= 0) continue

          let attachment_url = null

          // Upload attachment if any
          if (item.file) {
            const uploaded = await uploadAppFile(item.file, { directory: 'liquidations' })
            attachment_url = uploaded.path
          }

          // 1. Create the matching disbursement (this registers the expense)
          const vouchNum = `LIQ-${Date.now()}`
          const { data: disb, error: disbErr } = await supabase
            .from('disbursements')
            .insert({
              disbursement_number: vouchNum,
              category: item.category === 'transportation_equipment' ? 'transportation_equipment' : (item.category as any),
              amount: itemAmt,
              payment_date: item.receipt_date,
              payment_method: 'Cash',
              payee: advance.grantee_name,
              notes: `Cash Advance liquidation: ${item.description}. Ref: ${advance.reference_number}`,
              bank_account_id: advance.source_bank_account_id!,
              cash_advance_id: advance.id,
              is_advance_release: false,
              is_fund_transfer: false,
              period_month: parseInt(item.receipt_date.split('-')[1], 10),
              period_year: parseInt(item.receipt_date.split('-')[0], 10),
            })
            .select('id')
            .single()

          if (disbErr || !disb) throw disbErr || new Error('Disbursement creation failed.')

          // 2. Insert advance liquidation item
          const { error: liqErr } = await supabase
            .from('advance_liquidations')
            .insert({
              cash_advance_id: advance.id,
              amount: itemAmt,
              description: item.description.trim() || 'Liquidation item',
              category: item.category,
              receipt_date: item.receipt_date,
              receipt_number: item.receipt_number.trim() || null,
              attachment_url,
              disbursement_id: disb.id,
            })

          if (liqErr) throw liqErr
        }

        // 3. Update cash advance stats
        const newLiq = Number(advance.liquidated_amount) + activeLiqTotal
        const newOutstanding = Number(advance.outstanding_balance) - activeLiqTotal
        const newStatus = newOutstanding <= 0 ? 'liquidated' : 'partially_liquidated'
        const closedAt = newOutstanding <= 0 ? now.toISOString() : null

        const { error: updateErr } = await supabase
          .from('cash_advances')
          .update({
            liquidated_amount: newLiq,
            status: newStatus,
            closed_at: closedAt,
          })
          .eq('id', advance.id)

        if (updateErr) throw updateErr

        setLiquidateOpen(false)
        router.refresh()
      } catch (err: any) {
        setError(err.message || 'An error occurred during liquidation.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing/cash-advances">
              <ArrowLeft className="mr-2 size-4" />
              Advances
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-mono">{advance.reference_number}</h1>
            <p className="text-xs text-muted-foreground font-semibold">Grantee: {advance.grantee_name}</p>
          </div>
        </div>

        {/* Action Panel Gated by Status */}
        <div className="flex gap-2 shrink-0">
          {advance.status === 'pending_approval' && (
            <>
              <Button onClick={() => setApproveOpen(true)} size="sm">
                Approve Request
              </Button>
              <Button onClick={handleCancel} variant="destructive" size="sm" disabled={isPending}>
                Cancel Request
              </Button>
            </>
          )}

          {advance.status === 'approved' && (
            <>
              <Button onClick={() => setReleaseOpen(true)} size="sm">
                Release Funds
              </Button>
              <Button onClick={handleCancel} variant="destructive" size="sm" disabled={isPending}>
                Cancel Release
              </Button>
            </>
          )}

          {['released', 'partially_liquidated'].includes(advance.status) && (
            <>
              <Button onClick={() => setLiquidateOpen(true)} size="sm" className="bg-status-paid hover:bg-status-paid/90">
                Submit Liquidation
              </Button>
              <Button onClick={() => setReturnOpen(true)} size="sm" variant="outline">
                Record Return
              </Button>
            </>
          )}

          {['liquidated', 'cancelled'].includes(advance.status) && (
            <Badge variant="outline" className="border-slate-300 font-bold uppercase py-1 text-[10px]">
              Closed / Inactive
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm font-semibold bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 max-w-4xl">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Matrix Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved Amount</p>
            <p className="text-xl font-bold font-mono text-slate-800 mt-1">
              {fmt(Number(advance.approved_amount || advance.requested_amount))}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-indigo-50/20">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Released Amount</p>
            <p className="text-xl font-bold font-mono text-indigo-600 mt-1">{fmt(Number(advance.released_amount))}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-status-paid-bg/20">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Liquidated Amount</p>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{fmt(Number(advance.liquidated_amount))}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-status-pending-bg/20">
          <CardContent className="pt-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Outstanding Balance</p>
            <p className="text-xl font-bold font-mono text-amber-600 mt-1">{fmt(Number(advance.outstanding_balance))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Core details layout */}
      <div className="grid gap-6 lg:grid-cols-3 max-w-6xl">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Advance Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid gap-y-4 text-sm">
              <div className="grid grid-cols-2 border-b pb-2">
                <span className="text-muted-foreground font-semibold">Advance Type</span>
                <span className="font-bold capitalize">{advance.advance_type === 'pcf' ? 'Petty Cash Fund (PCF) Custodian' : 'Staff / Officer'}</span>
              </div>
              <div className="grid grid-cols-2 border-b pb-2">
                <span className="text-muted-foreground font-semibold">Purpose</span>
                <span className="font-medium">{advance.purpose}</span>
              </div>
              <div className="grid grid-cols-2 border-b pb-2">
                <span className="text-muted-foreground font-semibold">Status</span>
                <span>
                  <Badge className={`${CASH_ADVANCE_STATUS_COLORS[advance.status]} border font-bold uppercase text-[10px]`}>
                    {statusLabels[advance.status]}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-2 border-b pb-2">
                <span className="text-muted-foreground font-semibold">Source Account</span>
                <span className="font-semibold">{(advance.source_bank_account as any)?.name || 'Not released yet'}</span>
              </div>
              <div className="grid grid-cols-2 border-b pb-2">
                <span className="text-muted-foreground font-semibold">Due Liquidation Date</span>
                <span className="font-bold">
                  {advance.due_liquidation_date
                    ? new Date(advance.due_liquidation_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              {advance.notes && (
                <div className="space-y-1 pt-1">
                  <span className="text-muted-foreground font-semibold block">Notes</span>
                  <p className="bg-muted/40 p-3 rounded-lg border text-xs leading-relaxed font-medium">{advance.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Liquidations list card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Liquidated Expense Receipts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {liquidations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">No liquidations logged for this cash advance.</p>
              ) : (
                <div className="divide-y">
                  {liquidations.map((liq) => (
                    <div key={liq.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{liq.description}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                          {liq.category.replace('_', ' ')} · Receipt #{liq.receipt_number || 'None'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono font-bold text-indigo-600 text-sm">{fmt(Number(liq.amount))}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(liq.receipt_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        {liq.attachment_url && (
                          <Button variant="ghost" size="sm" asChild className="h-8 px-2 shrink-0">
                            <a
                              href={getFileUrl(liq.attachment_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[10px] flex items-center text-primary"
                            >
                              <FileText className="size-3.5 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Returns list card */}
          {returns.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Returned Excess Funds</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {returns.map((ret) => (
                    <div key={ret.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Returned Excess Cash</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                          Method: {ret.return_method || 'Cash'} · Ref: {ret.reference_number || 'None'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-amber-600 text-sm">{fmt(Number(ret.amount))}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(ret.returned_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Tracking Logs */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Lifecycle Tracking</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-semibold">
              <div className="flex gap-3">
                <CheckCircle className={`size-4 shrink-0 mt-0.5 ${advance.requested_at ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <p className="text-slate-800">Requested</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {new Date(advance.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className={`size-4 shrink-0 mt-0.5 ${advance.approved_at ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <p className="text-slate-800">Approved</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {advance.approved_at
                      ? new Date(advance.approved_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Pending Approval'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className={`size-4 shrink-0 mt-0.5 ${advance.released_at ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <p className="text-slate-800">Released</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {advance.released_at
                      ? new Date(advance.released_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Pending Release'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className={`size-4 shrink-0 mt-0.5 ${advance.status === 'liquidated' ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <p className="text-slate-800">Liquidated & Closed</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {advance.closed_at
                      ? new Date(advance.closed_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Outstanding balance remains'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* APPROVE DIALOG */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="appr_amount">Approved Amount (₱)</Label>
              <Input
                id="appr_amount"
                type="number"
                step="0.01"
                value={approveForm.approved_amount}
                onChange={(e) => setApproveForm({ ...approveForm, approved_amount: e.target.value })}
                className="font-mono font-bold h-10 text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appr_by">Approved By Name</Label>
              <Input
                id="appr_by"
                value={approveForm.approved_by}
                onChange={(e) => setApproveForm({ ...approveForm, approved_by: e.target.value })}
                placeholder="e.g. Treasurer Abby"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appr_notes">Approval Notes</Label>
              <Textarea
                id="appr_notes"
                value={approveForm.notes}
                onChange={(e) => setApproveForm({ ...approveForm, notes: e.target.value })}
                placeholder="Add notes or specifications..."
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={handleApprove} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Approve
            </Button>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RELEASE DIALOG */}
      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Release Advance Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="release_amount">Amount Released (₱)</Label>
              <Input
                id="release_amount"
                type="number"
                step="0.01"
                value={releaseForm.released_amount}
                onChange={(e) => setReleaseForm({ ...releaseForm, released_amount: e.target.value })}
                className="font-mono font-bold h-10 text-indigo-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="release_bank">Release Fund Source</Label>
              <Select
                value={releaseForm.source_bank_account_id}
                onValueChange={(val) => setReleaseForm({ ...releaseForm, source_bank_account_id: val })}
              >
                <SelectTrigger id="release_bank" className="h-10">
                  <SelectValue placeholder="Select fund bank account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="release_notes">Release Notes</Label>
              <Textarea
                id="release_notes"
                value={releaseForm.notes}
                onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })}
                placeholder="Check reference, release instructions..."
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={handleRelease} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm Release
            </Button>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECORD RETURN DIALOG */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Excess Cash Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="return_amount">Return Amount (₱)</Label>
              <Input
                id="return_amount"
                type="number"
                step="0.01"
                placeholder={String(advance.outstanding_balance)}
                value={returnForm.amount}
                onChange={(e) => setReturnForm({ ...returnForm, amount: e.target.value })}
                className="font-mono font-bold h-10 text-amber-600"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="return_method">Method</Label>
                <Select
                  value={returnForm.return_method}
                  onValueChange={(val) => setReturnForm({ ...returnForm, return_method: val as any })}
                >
                  <SelectTrigger id="return_method" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="return_ref">Reference #</Label>
                <Input
                  id="return_ref"
                  value={returnForm.reference_number}
                  onChange={(e) => setReturnForm({ ...returnForm, reference_number: e.target.value })}
                  placeholder="Receipt/Tx ID"
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return_by">Received By Name</Label>
              <Input
                id="return_by"
                value={returnForm.received_by}
                onChange={(e) => setReturnForm({ ...returnForm, received_by: e.target.value })}
                placeholder="Treasurer / Auditor"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return_notes">Notes</Label>
              <Textarea
                id="return_notes"
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                placeholder="Comments..."
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button onClick={handleRecordReturn} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Return
            </Button>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUBMIT LIQUIDATION SHEET */}
      <Sheet open={liquidateOpen} onOpenChange={setLiquidateOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle>Submit Advance Liquidation</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 pt-6">
            <div className="bg-status-pending-bg/50 p-4 border border-status-pending-border/60 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-amber-800">Outstanding Balance: {fmt(Number(advance.outstanding_balance))}</span>
              <p className="text-muted-foreground font-semibold">Ensure all entries match actual receipts. Receipts will log individual operational expenses.</p>
            </div>

            {/* Dynamic Items Rows */}
            <div className="space-y-6">
              {liqItems.map((item, idx) => (
                <div key={idx} className="border border-muted p-4 rounded-xl space-y-4 relative bg-card shadow-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Receipt Item #{idx + 1}</span>
                    {liqItems.length > 1 && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveLiqRow(idx)} className="text-status-overdue h-8 w-8 hover:bg-status-overdue-bg">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Category *</Label>
                      <Select
                        value={item.category}
                        onValueChange={(val) => handleLiqItemChange(idx, 'category', val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {disbursementCategories.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Amount (₱) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) => handleLiqItemChange(idx, 'amount', e.target.value)}
                        className="h-9 font-mono font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Receipt Number</Label>
                      <Input
                        placeholder="Receipt / Invoice #"
                        value={item.receipt_number}
                        onChange={(e) => handleLiqItemChange(idx, 'receipt_number', e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Receipt Date *</Label>
                      <Input
                        type="date"
                        value={item.receipt_date}
                        onChange={(e) => handleLiqItemChange(idx, 'receipt_date', e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Description *</Label>
                    <Input
                      placeholder="e.g. Purchased 10 units bond paper"
                      value={item.description}
                      onChange={(e) => handleLiqItemChange(idx, 'description', e.target.value)}
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Attachment (Proof Receipt)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLiqItemChange(idx, 'file', e.target.files?.[0] || null)}
                      className="cursor-pointer h-9 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={handleAddLiqRow} className="w-full h-10 font-bold border-dashed border-primary text-primary hover:bg-primary/5">
              <Plus className="size-4 mr-2" /> Add Receipt Row
            </Button>
          </div>

          <SheetFooter className="border-t pt-4 mt-6 flex flex-col gap-2">
            <div className="flex justify-between items-center w-full text-sm font-bold mb-2">
              <span className="text-slate-700">Submitting Liquidation Total:</span>
              <span className="font-mono text-indigo-600 text-lg">{fmt(activeLiqTotal)}</span>
            </div>
            <div className="flex gap-3 w-full">
              <Button onClick={handleSubmitLiquidation} disabled={isPending} className="flex-1 h-11 bg-status-paid hover:bg-status-paid/90 font-bold">
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirm Liquidation
              </Button>
              <Button variant="outline" onClick={() => setLiquidateOpen(false)} className="h-11 font-semibold">
                Cancel
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
