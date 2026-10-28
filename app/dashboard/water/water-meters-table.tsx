'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { WaterMeter, Property } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, FileText } from 'lucide-react'
import Link from 'next/link'

interface MeterWithProperty extends Omit<WaterMeter, 'property'> {
  property: Pick<Property, 'id' | 'block' | 'lot'> | null
}

const columns: ColumnDef<MeterWithProperty>[] = [
  {
    accessorKey: 'meter_number',
    header: 'Meter #',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.meter_number}</span>
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
    accessorKey: 'installation_date',
    header: 'Installed',
    cell: ({ row }) => row.original.installation_date || '-',
  },
  {
    accessorKey: 'last_reading_date',
    header: 'Last Reading',
    cell: ({ row }) => row.original.last_reading_date || '-',
  },
  {
    accessorKey: 'last_reading_value',
    header: 'Last Value',
    cell: ({ row }) =>
      `${Number(row.original.last_reading_value).toLocaleString()} cu.m.`,
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
      const meter = row.original
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
              <Link href={`/dashboard/water/readings/new?meter_id=${meter.id}`}>
                <FileText className="mr-2 size-4" />
                Record Reading
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/water/meters/${meter.id}/edit`}>
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

interface WaterMetersTableProps {
  meters: MeterWithProperty[]
}

export function WaterMetersTable({ meters }: WaterMetersTableProps) {
  return (
    <DataTable
      columns={columns}
      data={meters}
      searchKey="meter_number"
      searchPlaceholder="Search by meter number..."
    />
  )
}
