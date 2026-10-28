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
import { MoreHorizontal, Eye, Pencil, Trash2, Landmark } from 'lucide-react'
import Link from 'next/link'
import { NonInvoiceCollection } from '@/lib/types/database'

const columns: ColumnDef<NonInvoiceCollection>[] = [
  {
    accessorKey: 'receipt_number',
    header: 'Receipt #',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.receipt_number || '-'}</span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
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
  },
  {
    accessorKey: 'bank_account.name',
    header: 'Account',
    cell: ({ row }) => row.original.bank_account?.name || '-',
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
              <Link href={`/dashboard/billing/collections/non-invoice/${item.id}`}>
                <Eye className="mr-2 size-4" />
                View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/collections/non-invoice/${item.id}/edit`}>
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

interface NonInvoiceCollectionsTableProps {
  data: NonInvoiceCollection[]
}

export function NonInvoiceCollectionsTable({ data }: NonInvoiceCollectionsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="receipt_number"
      searchPlaceholder="Search by receipt number..."
      emptyTitle="No Non-Invoice Collections"
      emptyDescription="Record bank interest and other miscellaneous income here."
      emptyIcon={Landmark}
      createHref="/dashboard/billing/collections/non-invoice/new"
      createLabel="Add Collection"
    />
  )
}
