'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Vehicle, Property } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye, Car } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

interface VehicleWithProperty extends Omit<Vehicle, 'property'> {
  property: Pick<Property, 'id' | 'block' | 'lot'> | null
}

const vehicleTypeLabels: Record<string, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  suv: 'SUV',
  van: 'Van',
  truck: 'Truck',
  other: 'Other',
}

const columns: ColumnDef<VehicleWithProperty>[] = [
  {
    accessorKey: 'plate_number',
    header: 'Plate Number',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.plate_number}</span>
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
    accessorKey: 'vehicle_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.vehicle_type
      return type ? vehicleTypeLabels[type] || type : '-'
    },
  },
  {
    accessorKey: 'brand',
    header: 'Brand/Model',
    cell: ({ row }) => {
      const brand = row.original.brand
      const model = row.original.model
      if (!brand && !model) return '-'
      return [brand, model].filter(Boolean).join(' ')
    },
  },
  {
    accessorKey: 'color',
    header: 'Color',
    cell: ({ row }) => row.original.color || '-',
  },
  {
    accessorKey: 'sticker_number',
    header: 'Sticker',
    cell: ({ row }) => row.original.sticker_number || '-',
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const v = row.original
      if (v.is_active) {
        if (v.sticker_expires_at) {
          const expiry = new Date(v.sticker_expires_at)
          const now = new Date()
          const diffTime = expiry.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          if (diffDays <= 0) {
            return (
              <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">
                Expired ({expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })})
              </Badge>
            )
          } else if (diffDays <= 30) {
            return (
              <Badge variant="outline" className="text-status-pending bg-status-pending-bg border-status-pending-border">
                Expiring Soon ({diffDays}d)
              </Badge>
            )
          } else {
            return (
              <Badge variant="secondary" className="bg-status-paid-bg text-status-paid border-status-paid-border">
                Active (Expires {expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })})
              </Badge>
            )
          }
        }
        return (
          <Badge variant="secondary" className="bg-status-paid-bg text-status-paid border-status-paid-border">
            Active
          </Badge>
        )
      } else {
        if (v.sticker_invoice_id) {
          return (
            <Badge variant="outline" className="text-status-pending bg-status-pending-bg/50 border-status-pending-border">
              Unpaid Sticker
            </Badge>
          )
        }
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        )
      }
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const vehicle = row.original
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
              <Link href={`/dashboard/vehicles/${vehicle.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/vehicles/${vehicle.id}/edit`}>
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

interface VehiclesTableProps {
  vehicles: VehicleWithProperty[]
}

export function VehiclesTable({ vehicles }: VehiclesTableProps) {
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
      data={vehicles}
      searchKey="plate_number"
      searchPlaceholder="Search by plate number..."
      emptyTitle="No Vehicles Registered Yet"
      emptyDescription={`No vehicles are registered for ${branding.hoaFullName}. Add your first vehicle to track resident gate access stickers.`}
      emptyIcon={Car}
      createHref="/dashboard/vehicles/new"
      createLabel="Add Vehicle"
    />
  )
}
