'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Landmark } from 'lucide-react'

interface CombinedCollection {
  source_id: string
  source_type: 'payment' | 'non_invoice'
  reference_number: string | null
  amount: number
  payment_date: string
  payment_method: string
  external_ref: string | null
  created_at: string
  parent_ref: string | null
  block: number | null
  lot: number | null
}

const sourceTypeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  payment: { label: 'Payment', variant: 'default' },
  non_invoice: { label: 'Non-Invoice', variant: 'secondary' },
}

const columns: ColumnDef<CombinedCollection>[] = [
  {
    accessorKey: 'reference_number',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.reference_number || '-'}</span>
    ),
  },
  {
    accessorKey: 'source_type',
    header: 'Type',
    cell: ({ row }) => {
      const info = sourceTypeLabels[row.original.source_type]
      return <Badge variant={info?.variant || 'outline'}>{info?.label || row.original.source_type}</Badge>
    },
  },
  {
    accessorKey: 'parent_ref',
    header: 'Source',
    cell: ({ row }) => {
      const d = row.original
      if (d.source_type === 'payment') return <span className="text-muted-foreground">Invoice {d.parent_ref}</span>
      return <span className="text-muted-foreground">{d.parent_ref || '-'}</span>
    },
  },
  {
    id: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const d = row.original
      if (d.block && d.lot) return `Block ${d.block}, Lot ${d.lot}`
      return '-'
    },
  },
  {
    accessorKey: 'payment_date',
    header: 'Date',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-medium text-green-600">
        ₱{Number(row.original.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: 'payment_method',
    header: 'Method',
    cell: ({ row }) => row.original.payment_method || '-',
  },
]

interface CollectionCombinedTableProps {
  data: CombinedCollection[]
}

export function CollectionCombinedTable({ data }: CollectionCombinedTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="reference_number"
      searchPlaceholder="Search collections..."
      emptyTitle="No Collections Yet"
      emptyDescription="Income will appear here from invoice payments and non-invoice collections."
      emptyIcon={Landmark}
    />
  )
}
