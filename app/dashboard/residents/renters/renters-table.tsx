'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Renter, Property } from '@/lib/types/database'
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

interface RenterWithProperty extends Omit<Renter, 'property'> {
  property: Pick<Property, 'id' | 'block' | 'lot' | 'status'> | null
}

const columns: ColumnDef<RenterWithProperty>[] = [
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
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.is_active ? 'secondary' : 'outline'}
        className={row.original.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'text-muted-foreground'}
      >
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const renter = row.original
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
              <Link href={`/dashboard/residents/renters/${renter.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/residents/renters/${renter.id}/edit`}>
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

interface RentersTableProps {
  renters: RenterWithProperty[]
}

export function RentersTable({ renters }: RentersTableProps) {
  return (
    <DataTable
      columns={columns}
      data={renters}
      searchKey="last_name"
      searchPlaceholder="Search by name..."
      emptyTitle="No Renters Registered Yet"
      emptyDescription="No tenants are currently registered. Add your first renter profile to associate them with a property."
      emptyIcon={User}
      createHref="/dashboard/residents/renters/new"
      createLabel="Add Renter"
    />
  )
}
