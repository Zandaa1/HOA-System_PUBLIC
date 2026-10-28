'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Property, PropertyType } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2, Building2 } from 'lucide-react'
import Link from 'next/link'
import { PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS } from '@/lib/constants'
import { useEffect, useState } from 'react'
import { getBranding, DEFAULT_BRANDING, type Branding } from '@/lib/branding'
import { createClient } from '@/lib/supabase/client'

interface PropertyWithRelations extends Omit<Property, 'property_type' | 'homeowners' | 'vehicles'> {
  property_type: PropertyType | null
  homeowners: { id: string; first_name: string; last_name: string; }[]
  vehicles: { id: string; plate_number: string; is_active: boolean; }[]
}

const columns: ColumnDef<PropertyWithRelations>[] = [
  {
    id: 'property',
    accessorFn: (row) =>
      `Block ${row.block} Lot ${row.lot} ${row.phase || ''} ${row.street_address || ''}`,
    header: 'Property',
    cell: ({ row }) => (
      <div className="max-w-[220px]">
        <p className="font-semibold">Block {row.original.block}, Lot {row.original.lot}</p>
        <p className="text-xs text-muted-foreground whitespace-normal">
          {row.original.phase ? `Phase ${row.original.phase}` : 'No phase'}{' '}
          {row.original.street_address ? `· ${row.original.street_address}` : ''}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'property_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.property_type
      if (!type) return '-'
      return (
        <Badge variant="outline" style={{ borderColor: type.color, color: type.color }} className="whitespace-nowrap">
          {type.name}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge className={cn(PROPERTY_STATUS_COLORS[status], "whitespace-nowrap")} variant="secondary">
          {PROPERTY_STATUS_LABELS[status]}
        </Badge>
      )
    },
  },
  {
    id: 'residents',
    header: 'Residents',
    cell: ({ row }) => {
      const homeowners = row.original.homeowners || []
      const totalResidents = homeowners.length

      if (totalResidents === 0) return <span className="text-muted-foreground">No residents</span>

      return (
        <div className="max-w-[260px] space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">
            {totalResidents} resident{totalResidents > 1 ? 's' : ''}
          </p>
          {homeowners.length > 0 && (
            <p className="text-xs whitespace-normal">
              <span className="font-semibold">Owners:</span>{' '}
              {homeowners.map((owner) => `${owner.first_name} ${owner.last_name}`).join(', ')}
            </p>
          )}
        </div>
      )
    },
  },
  {
    id: 'vehicles',
    header: 'Vehicles',
    cell: ({ row }) => {
      const vehicles = row.original.vehicles || []
      const activeVehicles = vehicles.filter((vehicle) => vehicle.is_active)
      if (vehicles.length === 0) return <span className="text-muted-foreground">None</span>
      return (
        <div className="max-w-[180px]">
          <p className="text-xs font-semibold">
            {activeVehicles.length} active / {vehicles.length} total
          </p>
          <p className="text-xs text-muted-foreground">
            {vehicles.slice(0, 2).map((vehicle) => vehicle.plate_number).join(', ')}
            {vehicles.length > 2 ? ` +${vehicles.length - 2}` : ''}
          </p>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const property = row.original
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
              <Link href={`/dashboard/properties/${property.id}`}>
                <Eye className="mr-2 size-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/properties/${property.id}/edit`}>
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

interface PropertiesTableProps {
  properties: PropertyWithRelations[]
  propertyTypes: PropertyType[]
}

export function PropertiesTable({ properties }: PropertiesTableProps) {
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
      data={properties}
      searchKey="property"
      searchPlaceholder="Search block, lot, phase, or address..."
      emptyTitle="No Properties Registered Yet"
      emptyDescription={`No properties are currently registered in ${branding.hoaFullName}. Add your first property (block, lot, type, occupancy status) to get started.`}
      emptyIcon={Building2}
      createHref="/dashboard/properties/new"
      createLabel="Add Property"
    />
  )
}
