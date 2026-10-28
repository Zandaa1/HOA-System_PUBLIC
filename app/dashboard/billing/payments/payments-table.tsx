'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Property } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Printer, Pencil, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface PaymentWithInvoice {
  id: string
  invoice_id: string
  payment_number: string
  amount: number
  payment_date: string
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'gcash' | 'maya' | 'other' | null
  reference_number: string | null
  invoice: {
    invoice_number: string
    property: Pick<Property, 'block' | 'lot'> | null
  } | null
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  other: 'Other',
}

const columns: ColumnDef<PaymentWithInvoice>[] = [
  {
    accessorKey: 'payment_number',
    header: 'Payment #',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.payment_number}</span>
    ),
  },
  {
    accessorKey: 'invoice',
    header: 'Invoice',
    cell: ({ row }) => {
      const invoice = row.original.invoice
      if (!invoice) return '-'
      return (
        <Link
          href={`/dashboard/billing/invoices/${row.original.invoice_id}`}
          className="text-primary hover:underline"
        >
          {invoice.invoice_number}
        </Link>
      )
    },
  },
  {
    accessorKey: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const property = row.original.invoice?.property
      if (!property) return '-'
      return `Block ${property.block}, Lot ${property.lot}`
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
        ₱{Number(row.original.amount).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: 'payment_method',
    header: 'Method',
    cell: ({ row }) => {
      const method = row.original.payment_method
      if (!method) return '-'
      return (
        <Badge variant="outline">
          {paymentMethodLabels[method] || method}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'reference_number',
    header: 'Reference',
    cell: ({ row }) => row.original.reference_number || '-',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original
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
              <Link href={`/dashboard/billing/payments/${payment.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/payments/${payment.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/payments/${payment.id}/receipt`}>
                <Printer className="mr-2 size-4" />
                Print Receipt
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface PaymentsTableProps {
  payments: PaymentWithInvoice[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={payments}
      searchKey="payment_number"
      searchPlaceholder="Search by payment number..."
      emptyTitle="No Payments Recorded Yet"
      emptyDescription="No payments have been recorded. Record homeowner dues, amenity fees, or utility bill collections to update account balances."
      emptyIcon={CreditCard}
      createHref="/dashboard/billing/payments/new"
      createLabel="Record Payment"
    />
  )
}
