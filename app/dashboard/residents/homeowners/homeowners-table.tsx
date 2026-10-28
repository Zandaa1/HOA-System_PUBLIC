'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Homeowner, Property } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, User } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/status-badge'

interface HomeownerWithProperty extends Omit<Homeowner, 'property'> {
  property: Pick<Property, 'id' | 'block' | 'lot' | 'status'> | null
}

const columns: ColumnDef<HomeownerWithProperty>[] = [
  {
    accessorKey: 'last_name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.first_name} {row.original.middle_name ? `${row.original.middle_name.charAt(0)}. ` : ''}{row.original.last_name}
        </p>
      </div>
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
          className="text-primary hover:underline"
        >
          Block {property.block}, Lot {property.lot}
        </Link>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email || '-',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.original.phone || '-',
  },
  {
    accessorKey: 'is_residing',
    header: 'Residing',
    cell: ({ row }) => (
      <Badge 
        variant={row.original.is_residing ? 'secondary' : 'outline'}
        className={row.original.is_residing ? 'bg-green-50 text-green-700 border-green-200' : 'text-muted-foreground'}
      >
        {row.original.is_residing ? 'Yes' : 'No'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const homeowner = row.original
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
              <Link href={`/dashboard/residents/homeowners/${homeowner.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/residents/homeowners/${homeowner.id}/edit`}>
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

interface HomeownersTableProps {
  homeowners: HomeownerWithProperty[]
}

export function HomeownersTable({ homeowners }: HomeownersTableProps) {
  return (
    <DataTable
      columns={columns}
      data={homeowners}
      searchKey="last_name"
      searchPlaceholder="Search by name..."
      emptyTitle="No Homeowners Registered Yet"
      emptyDescription="No homeowners are currently registered. Add your first homeowner profile to associate them with a property."
      emptyIcon={User}
      createHref="/dashboard/residents/homeowners/new"
      createLabel="Add Homeowner"
    />
  )
}
