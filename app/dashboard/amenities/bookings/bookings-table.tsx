'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Amenity, Property } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil } from 'lucide-react'
import Link from 'next/link'
import { BookingRowActions } from './booking-row-actions'
import { BOOKING_STATUS_COLORS } from '@/lib/constants'

interface BookingWithRelations {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  booked_by_name: string
  status: 'pending' | 'confirmed' | 'approved' | 'cancelled' | 'completed'
  amenity: Pick<Amenity, 'name'> | null
  property: Pick<Property, 'block' | 'lot'> | null
}

const statusColors: Record<string, string> = {
  ...BOOKING_STATUS_COLORS,
  approved: BOOKING_STATUS_COLORS.confirmed || 'bg-status-paid-bg text-status-paid border-status-paid-border',
}

const columns: ColumnDef<BookingWithRelations>[] = [
  {
    accessorKey: 'booking_date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.booking_date}</span>
    ),
  },
  {
    accessorKey: 'amenity',
    header: 'Amenity',
    cell: ({ row }) => row.original.amenity?.name || '-',
  },
  {
    accessorKey: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const property = row.original.property
      if (!property) return '-'
      return `Block ${property.block}, Lot ${property.lot}`
    },
  },
  {
    accessorKey: 'booked_by_name',
    header: 'Booked By',
  },
  {
    accessorKey: 'time',
    header: 'Time',
    cell: ({ row }) =>
      `${row.original.start_time.replace(/:00$/, '')} - ${row.original.end_time.replace(/:00$/, '')}`,
  },
  {
    accessorKey: 'total_amount',
    header: 'Amount',
    cell: ({ row }) =>
      `₱${Number(row.original.total_amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
      })}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status]} variant="secondary">
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const booking = row.original
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
              <Link href={`/dashboard/amenities/bookings/${booking.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/amenities/bookings/${booking.id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <BookingRowActions bookingId={booking.id} status={booking.status} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface BookingsTableProps {
  bookings: BookingWithRelations[]
}

export function BookingsTable({ bookings }: BookingsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={bookings}
      searchKey="booked_by_name"
      searchPlaceholder="Search by name..."
    />
  )
}
