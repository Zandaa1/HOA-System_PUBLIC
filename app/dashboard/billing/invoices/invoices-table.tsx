'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Invoice, Property, BillingPeriod } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, CreditCard, FileText } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

interface InvoiceWithRelations extends Omit<Invoice, 'property' | 'billing_period'> {
  property: Pick<Property, 'id' | 'block' | 'lot'> | null
  billing_period: Pick<BillingPeriod, 'name'> | null
}

const columns: ColumnDef<InvoiceWithRelations>[] = [
  {
    accessorKey: 'invoice_number',
    header: 'Invoice #',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/billing/invoices/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.invoice_number}
      </Link>
    ),
  },
  {
    accessorKey: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const property = row.original.property
      if (!property) return '-'
      return (
        <Link
          href={`/dashboard/properties/${property.id}`}
          className="hover:underline"
        >
          Block {property.block}, Lot {property.lot}
        </Link>
      )
    },
  },
  {
    accessorKey: 'billing_period',
    header: 'Period',
    cell: ({ row }) => row.original.billing_period?.name || '-',
  },
  {
    accessorKey: 'due_date',
    header: 'Due Date',
  },
  {
    accessorKey: 'total_amount',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-mono">
        ₱{Number(row.original.total_amount).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = Number(row.original.balance)
      return (
        <span className={`font-mono ${balance > 0 ? 'text-status-overdue font-semibold' : ''}`}>
          ₱{balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge type="invoice" status={row.original.status} />,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const invoice = row.original
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
              <Link href={`/dashboard/billing/invoices/${invoice.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/billing/payments/new?invoice_id=${invoice.id}`}>
                  <CreditCard className="mr-2 size-4" />
                  Record Payment
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/invoices/${invoice.id}/print`}>
                <FileText className="mr-2 size-4" />
                Print Invoice
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface InvoicesTableProps {
  invoices: InvoiceWithRelations[]
  totalCount: number
  pageCount: number
  currentPage: number
}

export function InvoicesTable({
  invoices,
  totalCount,
  pageCount,
  currentPage,
}: InvoicesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get('search') || ''
  const [searchValue, setSearchValue] = useState(initialSearch)

  useEffect(() => {
    // Prevent run on mount if values are identical
    if (searchValue === (searchParams.get('search') || '')) {
      return
    }

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchValue) {
        params.set('search', searchValue)
      } else {
        params.delete('search')
      }
      params.set('page', '1') // Reset to page 1 on new search
      router.push(`${pathname}?${params.toString()}`)
    }, 400)

    return () => clearTimeout(delayDebounce)
  }, [searchValue, router, pathname, searchParams])

  const handlePageChange = (pageIndex: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (pageIndex + 1).toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <DataTable
      columns={columns}
      data={invoices}
      searchKey="invoice_number"
      searchPlaceholder="Search by invoice number..."
      emptyTitle="No Invoices Found"
      emptyDescription="No invoices have been generated or created yet. Generate batch monthly dues or create a custom invoice for properties."
      emptyIcon={FileText}
      createHref="/dashboard/billing/invoices/new"
      createLabel="Create Invoice"
      serverPaged={true}
      pageCount={pageCount}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      totalCount={totalCount}
      initialSearch={searchValue}
      onSearchChange={setSearchValue}
    />
  )
}
