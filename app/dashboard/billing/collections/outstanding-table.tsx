'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle } from 'lucide-react'

interface AgingBucket {
  current: number
  days1_30: number
  days31_60: number
  days61_90: number
  days90plus: number
}

interface PropertyOutstanding {
  propertyId: string
  block: string
  lot: string
  homeowners: { first_name: string; last_name: string }[]
  invoices: { id: string; invoice_number: string; due_date: string; balance: number; total_amount: number; status: string }[]
  aging: AgingBucket
  totalOutstanding: number
  advanceDepositCredit: number
  netOutstanding: number
}

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const bucket = (label: string, value: number, className: string) =>
  value > 0 ? (
    <span key={label} className={`font-mono text-xs ${className}`}>
      {label}: {fmt(value)}
    </span>
  ) : null

const columns: ColumnDef<PropertyOutstanding>[] = [
  {
    id: 'property',
    header: 'Property',
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium truncate">Block {row.original.block}, Lot {row.original.lot}</p>
        <p className="text-xs text-muted-foreground truncate">
          {row.original.homeowners.map((h) => `${h.first_name} ${h.last_name}`).join(', ') || 'No owner'}
        </p>
      </div>
    ),
  },
  {
    id: 'aging',
    header: 'Aging',
    cell: ({ row }) => {
      const { aging } = row.original
      const buckets = [
        bucket('Curr', aging.current, 'text-foreground'),
        bucket('1–30', aging.days1_30, 'text-amber-600'),
        bucket('31–60', aging.days31_60, 'text-orange-600'),
        bucket('61–90', aging.days61_90, 'text-red-600'),
        bucket('90+', aging.days90plus, 'text-destructive font-bold'),
      ].filter(Boolean)
      return buckets.length > 0 ? (
        <div className="flex flex-col gap-0.5">{buckets}</div>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: 'totalOutstanding',
    header: 'Total Outstanding',
    cell: ({ row }) => (
      <span className="font-bold font-mono text-sm whitespace-nowrap">{fmt(row.original.totalOutstanding)}</span>
    ),
  },
  {
    accessorKey: 'advanceDepositCredit',
    header: 'Deposit Credit',
    cell: ({ row }) => {
      const v = row.original.advanceDepositCredit
      return v > 0 ? (
        <span className="font-mono text-sm text-green-600 whitespace-nowrap">({fmt(v)})</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: 'netOutstanding',
    header: 'Net Owed',
    cell: ({ row }) => (
      <span className="font-bold font-mono text-sm whitespace-nowrap">{fmt(Math.max(0, row.original.netOutstanding))}</span>
    ),
  },
  {
    id: 'invoices',
    header: 'Invoices',
    cell: ({ row }) => {
      const invs = row.original.invoices
      const overdue = invs.filter((i) => i.status === 'overdue').length
      return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-sm">{invs.length} open</span>
          {overdue > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="bg-status-overdue-bg text-status-overdue border-status-overdue-border text-[10px] font-bold whitespace-nowrap">
                  {overdue} overdue
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{overdue} invoice(s) past due date</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )
    },
  },
]

interface OutstandingTableProps {
  data: PropertyOutstanding[]
}

export function OutstandingTable({ data }: OutstandingTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="No Outstanding Balances"
      emptyDescription="All invoices are paid and no balances are due."
      emptyIcon={AlertCircle}
    />
  )
}
