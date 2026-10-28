'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Staff } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ACCESS_GROUPS } from '@/lib/modules'

function accessSummary(permissions: Record<string, boolean> | null | undefined) {
  if (permissions?.all) return 'Full access'
  const count = ACCESS_GROUPS.filter((group) => permissions?.[group.key]).length
  return `${count} area${count === 1 ? '' : 's'}`
}

const columns: ColumnDef<Staff>[] = [
  {
    accessorKey: 'employee_id',
    header: 'ID',
    cell: ({ row }) => <span className="font-medium">{row.original.employee_id}</span>,
  },
  {
    accessorKey: 'full_name',
    header: 'Name',
    cell: ({ row }) => `${row.original.first_name} ${row.original.last_name}`,
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'position',
    header: 'Position',
    cell: ({ row }) => row.original.position || '-',
  },
  {
    id: 'access',
    header: 'Access',
    cell: ({ row }) => <Badge variant="outline">{accessSummary(row.original.permissions)}</Badge>,
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const staff = row.original
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
              <Link href={`/dashboard/admin/staff/${staff.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/admin/staff/${staff.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface StaffTableProps {
  staff: Staff[]
}

export function StaffTable({ staff }: StaffTableProps) {
  return (
    <DataTable
      columns={columns}
      data={staff}
      searchKey="employee_id"
      searchPlaceholder="Search by ID..."
    />
  )
}
