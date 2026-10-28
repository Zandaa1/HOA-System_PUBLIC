'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Landmark } from 'lucide-react'
import Link from 'next/link'

interface AdvanceDepositWithProperty {
  id: string
  property_id: string
  amount: number
  deposit_date: string
  payment_method: string | null
  reference_number: string | null
  remaining_balance: number
  notes: string | null
  property: { block: number; lot: number } | null
}

const columns: ColumnDef<AdvanceDepositWithProperty>[] = [
  {
    accessorKey: 'reference_number',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.reference_number || '-'}</span>
    ),
  },
  {
    id: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const p = row.original.property
      return p ? `Block ${p.block}, Lot ${p.lot}` : '-'
    },
  },
  {
    accessorKey: 'deposit_date',
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
    accessorKey: 'remaining_balance',
    header: 'Remaining',
    cell: ({ row }) => (
      <span className="font-medium">
        ₱{Number(row.original.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: 'payment_method',
    header: 'Method',
    cell: ({ row }) => row.original.payment_method || '-',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const item = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/collections/advance-deposits/${item.id}`}>
                <Eye className="mr-2 size-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/collections/advance-deposits/${item.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface AdvanceDepositsTableProps {
  data: AdvanceDepositWithProperty[]
}

export function AdvanceDepositsTable({ data }: AdvanceDepositsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="reference_number"
      searchPlaceholder="Search deposits..."
      emptyTitle="No Advance Deposits"
      emptyDescription="Record prepayments and deposits from homeowners here."
      emptyIcon={Landmark}
      createHref="/dashboard/billing/collections/advance-deposits/new"
      createLabel="Add Deposit"
    />
  )
}
