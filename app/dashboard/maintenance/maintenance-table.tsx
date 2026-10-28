'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Wrench } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  assigned: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  in_progress: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  completed: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
}

const priorityColors: Record<string, string> = {
  low: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
  medium: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  high: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  emergency: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border animate-pulse',
}

const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const prop = row.original.property
      if (!prop) return '-'
      return (
        <Link
          href={`/dashboard/properties/${prop.id}`}
          className="text-primary hover:underline font-semibold"
        >
          Block {prop.block}, Lot {prop.lot}
        </Link>
      )
    },
  },
  {
    accessorKey: 'title',
    header: 'Request / Job',
    cell: ({ row }) => (
      <div className="max-w-[280px]">
        <p className="font-semibold">{row.original.title}</p>
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
          {row.original.category}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const p = row.original.priority
      return (
        <Badge variant="outline" className={`capitalize font-semibold ${priorityColors[p]}`}>
          {p}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'vendor',
    header: 'Assigned Vendor',
    cell: ({ row }) => {
      const v = row.original.vendor
      if (!v) return <span className="text-muted-foreground text-xs italic">Unassigned</span>
      return <span className="font-medium">{v.name}</span>
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Submitted',
    cell: ({ row }) => format(new Date(row.original.created_at), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status
      return (
        <Badge variant="outline" className={statusColors[s]}>
          {statusLabels[s] || s}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href={`/dashboard/maintenance/${row.original.id}`}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Details</span>
          </Link>
        </Button>
      </div>
    ),
  },
]

interface MaintenanceTableProps {
  data: any[]
}

export function MaintenanceTable({ data }: MaintenanceTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="title"
      searchPlaceholder="Search by request title..."
      emptyTitle="No Maintenance Requests"
      emptyDescription="Everything in the subdivision is in working order! Requests submitted by residents or logged by staff will appear here."
      emptyIcon={Wrench}
    />
  )
}
