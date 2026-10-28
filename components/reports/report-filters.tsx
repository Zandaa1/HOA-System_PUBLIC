'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ReportFilters({ 
  selectedYear, 
  dataToExport 
}: { 
  selectedYear: string; 
  dataToExport: { summary: any[], revenueByFeeType: any[] }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const years = ['2026', '2025', '2024']

  const onYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('year', year)
    router.push(`${pathname}?${params.toString()}`)
  }

  const exportToCSV = () => {
    // Basic CSV generation for summary
    const headers = ['Period', 'Billed', 'Paid', 'Arrears']
    const rows = dataToExport.summary.map(item => [
      item.billing_period_name,
      item.total_billed,
      item.total_paid,
      item.total_arrears
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial_summary_${selectedYear}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex items-center gap-4">
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(year => (
            <SelectItem key={year} value={year}>{year}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={exportToCSV}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    </div>
  )
}
