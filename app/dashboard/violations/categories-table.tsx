'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { FileText } from 'lucide-react'

const categoryColumns: ColumnDef<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => row.original.description || '-',
  },
  {
    accessorKey: 'fine_amount',
    header: 'Default Fine',
    cell: ({ row }) => (
      <span className="font-medium">
        ₱{Number(row.original.fine_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
]

interface CategoriesTableProps {
  data: any[]
}

export function CategoriesTable({ data }: CategoriesTableProps) {
  return (
    <DataTable
      columns={categoryColumns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search by category name..."
      emptyTitle="No Categories Defined"
      emptyDescription="No violation categories are registered yet. Setup standard templates with guide fine values."
      emptyIcon={FileText}
      createHref="/dashboard/violations/categories"
      createLabel="Setup Categories"
    />
  )
}
