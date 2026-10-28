'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Printer, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

const statusLabels: Record<string, string> = {
  warning_issued: 'Warning Issued',
  fine_issued: 'Fine Issued',
  resolved: 'Resolved',
  appealed: 'Appealed',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, string> = {
  warning_issued: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  fine_issued: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
  resolved: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  appealed: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
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
    header: 'Violation',
    cell: ({ row }) => (
      <div className="max-w-[280px]">
        <p className="font-semibold">{row.original.title}</p>
        {row.original.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'incident_date',
    header: 'Incident Date',
    cell: ({ row }) => format(new Date(row.original.incident_date), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'fine_applied',
    header: 'Fine Amount',
    cell: ({ row }) => (
      <span className="font-medium text-foreground">
        ₱{Number(row.original.fine_applied).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge variant="outline" className={statusColors[status]}>
          {statusLabels[status] || status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href={`/dashboard/violations/${row.original.id}`}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Details</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href={`/dashboard/violations/${row.original.id}/print`}>
            <Printer className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Print</span>
          </Link>
        </Button>
      </div>
    ),
  },
]

interface ViolationsTableProps {
  data: any[]
}

export function ViolationsTable({ data }: ViolationsTableProps) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)

  useEffect(() => {
    async function loadBranding() {
      const supabase = createClient()
      const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
      if (settings) setBranding(getBranding(settings))
    }
    loadBranding()
  }, [])

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="title"
      searchPlaceholder="Search by violation title..."
      emptyTitle="No Violations Logged"
      emptyDescription={`All properties in ${branding.hoaFullName} are currently compliant! Click 'Log Violation' if you need to record an incident.`}
      emptyIcon={ShieldAlert}
      createHref="/dashboard/violations/new"
      createLabel="Log Violation"
    />
  )
}
