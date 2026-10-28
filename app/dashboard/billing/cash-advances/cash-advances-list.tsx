'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { MoreHorizontal, Eye, PiggyBank, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { CashAdvance } from '@/lib/types/database'
import { CASH_ADVANCE_STATUS_COLORS } from '@/lib/constants'

interface CashAdvancesListProps {
  advances: CashAdvance[]
  aging: any[]
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  released: 'Released',
  partially_liquidated: 'Partially Liquidated',
  liquidated: 'Liquidated',
  cancelled: 'Cancelled',
}

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

export function CashAdvancesList({ advances, aging }: CashAdvancesListProps) {
  const [activeTab, setActiveTab] = useState<string>('all')

  const columns: ColumnDef<CashAdvance>[] = [
    {
      accessorKey: 'reference_number',
      header: 'Reference #',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/billing/cash-advances/${row.original.id}`}
          className="font-bold text-primary hover:underline font-mono"
        >
          {row.original.reference_number}
        </Link>
      ),
    },
    {
      accessorKey: 'grantee_name',
      header: 'Grantee',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.original.grantee_name}</p>
          {row.original.grantee_role && (
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              {row.original.grantee_role}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'purpose',
      header: 'Purpose',
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] block font-medium">
          {row.original.purpose}
        </span>
      ),
    },
    {
      accessorKey: 'advance_type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize font-bold text-[10px]">
          {row.original.advance_type === 'pcf' ? 'Petty Cash (PCF)' : 'Staff Advance'}
        </Badge>
      ),
    },
    {
      accessorKey: 'released_amount',
      header: 'Released / Approved',
      cell: ({ row }) => {
        const released = Number(row.original.released_amount)
        const approved = Number(row.original.approved_amount || row.original.requested_amount)
        return (
          <div className="font-mono text-sm font-semibold">
            {released > 0 ? (
              <span className="text-indigo-600">{fmt(released)}</span>
            ) : (
              <span className="text-muted-foreground">{fmt(approved)} (Appr)</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'liquidated_amount',
      header: 'Liquidated',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-emerald-600">
          {Number(row.original.liquidated_amount) > 0 ? fmt(Number(row.original.liquidated_amount)) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'outstanding_balance',
      header: 'Outstanding',
      cell: ({ row }) => {
        const bal = Number(row.original.outstanding_balance)
        return (
          <span className={`font-mono text-sm font-bold ${bal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {bal > 0 ? fmt(bal) : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'due_liquidation_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const dt = row.original.due_liquidation_date
        if (!dt) return '—'
        const isOverdue =
          new Date(dt) < new Date() &&
          ['released', 'partially_liquidated'].includes(row.original.status)
        return (
          <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
            {new Date(dt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={`${CASH_ADVANCE_STATUS_COLORS[row.original.status]} border font-bold uppercase text-[10px]`}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/billing/cash-advances/${row.original.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const agingColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'reference_number',
      header: 'Reference #',
      cell: ({ row }) => (
        <Link
          href={`/dashboard/billing/cash-advances/${row.original.id}`}
          className="font-bold text-primary hover:underline font-mono"
        >
          {row.original.reference_number}
        </Link>
      ),
    },
    {
      accessorKey: 'grantee_name',
      header: 'Grantee',
      cell: ({ row }) => <span className="font-semibold">{row.original.grantee_name}</span>,
    },
    {
      accessorKey: 'released_amount',
      header: 'Released',
      cell: ({ row }) => <span className="font-mono text-sm font-semibold">{fmt(Number(row.original.released_amount))}</span>,
    },
    {
      accessorKey: 'outstanding_balance',
      header: 'Outstanding Balance',
      cell: ({ row }) => <span className="font-mono text-sm font-bold text-amber-600">{fmt(Number(row.original.outstanding_balance))}</span>,
    },
    {
      accessorKey: 'due_liquidation_date',
      header: 'Due Date',
      cell: ({ row }) => (
        <span className="font-semibold">
          {new Date(row.original.due_liquidation_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      accessorKey: 'days_overdue',
      header: 'Days Overdue',
      cell: ({ row }) => (
        <span className="font-bold text-rose-600 font-mono">
          {row.original.days_overdue} days
        </span>
      ),
    },
    {
      accessorKey: 'aging_bucket',
      header: 'Aging Category',
      cell: ({ row }) => (
        <Badge variant="outline" className="border-status-overdue-border bg-status-overdue-bg text-status-overdue font-bold uppercase text-[9px]">
          {row.original.aging_bucket}
        </Badge>
      ),
    },
  ]

  // Filter advances based on active tab
  const getFilteredData = () => {
    switch (activeTab) {
      case 'pending':
        return advances.filter((a) => a.status === 'pending_approval')
      case 'active':
        return advances.filter((a) => ['released', 'partially_liquidated'].includes(a.status))
      case 'overdue':
        return advances.filter(
          (a) =>
            ['released', 'partially_liquidated'].includes(a.status) &&
            a.due_liquidation_date &&
            new Date(a.due_liquidation_date) < new Date()
        )
      case 'closed':
        return advances.filter((a) => ['liquidated', 'cancelled'].includes(a.status))
      default:
        return advances
    }
  }

  const totals = {
    released: advances.reduce((s, a) => s + Number(a.released_amount), 0),
    liquidated: advances.reduce((s, a) => s + Number(a.liquidated_amount), 0),
    outstanding: advances.reduce((s, a) => s + Number(a.outstanding_balance), 0),
    overdueCount: advances.filter(
      (a) =>
        ['released', 'partially_liquidated'].includes(a.status) &&
        a.due_liquidation_date &&
        new Date(a.due_liquidation_date) < new Date()
    ).length,
  }

  return (
    <div className="space-y-6">
      {/* Top Rollup Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Released (YTD)</p>
              <p className="text-2xl font-bold font-mono text-indigo-600">{fmt(totals.released)}</p>
            </div>
            <DollarSign className="size-8 text-indigo-600/30" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Liquidated</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">{fmt(totals.liquidated)}</p>
            </div>
            <PiggyBank className="size-8 text-emerald-600/30" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardContent className="pt-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold font-mono text-amber-600">{fmt(totals.outstanding)}</p>
            </div>
            <Calendar className="size-8 text-amber-600/30" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs list filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-muted/40 p-1 border border-muted/60">
            <TabsTrigger value="all" className="font-bold text-xs uppercase px-4 h-8">All</TabsTrigger>
            <TabsTrigger value="pending" className="font-bold text-xs uppercase px-4 h-8">
              Pending Approval
            </TabsTrigger>
            <TabsTrigger value="active" className="font-bold text-xs uppercase px-4 h-8">Active</TabsTrigger>
            <TabsTrigger value="overdue" className="font-bold text-xs uppercase px-4 h-8 flex items-center gap-1.5">
              Overdue
              {totals.overdueCount > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center">
                  {totals.overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed" className="font-bold text-xs uppercase px-4 h-8">Closed</TabsTrigger>
            <TabsTrigger value="aging" className="font-bold text-xs uppercase px-4 h-8 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Aging Report
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="aging" className="pt-4 mt-0">
          <DataTable
            columns={agingColumns}
            data={aging}
            searchKey="grantee_name"
            searchPlaceholder="Search aging by grantee name..."
            emptyTitle="No Overdue Advances"
            emptyDescription="There are no cash advances currently overdue for liquidation. Excellent work!"
            emptyIcon={PiggyBank}
          />
        </TabsContent>

        {['all', 'pending', 'active', 'overdue', 'closed'].map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-4 mt-0">
            <DataTable
              columns={columns}
              data={getFilteredData()}
              searchKey="reference_number"
              searchPlaceholder="Search by reference number..."
              emptyTitle="No Cash Advances Found"
              emptyDescription="Create a new Staff or Petty Cash Advance request using the buttons above."
              emptyIcon={PiggyBank}
              createHref="/dashboard/billing/cash-advances/new"
              createLabel="Request Advance"
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
