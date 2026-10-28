'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { WaterReading, WaterMeter, Property } from '@/lib/types/database'

interface ReadingWithMeter extends Omit<WaterReading, 'meter'> {
  meter: (Pick<WaterMeter, 'meter_number'> & {
    property: Pick<Property, 'block' | 'lot'> | null
  }) | null
}

const columns: ColumnDef<ReadingWithMeter>[] = [
  {
    accessorKey: 'reading_date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.reading_date}</span>
    ),
  },
  {
    accessorKey: 'meter',
    header: 'Meter',
    cell: ({ row }) => row.original.meter?.meter_number || '-',
  },
  {
    accessorKey: 'property',
    header: 'Property',
    cell: ({ row }) => {
      const property = row.original.meter?.property
      if (!property) return '-'
      return `Block ${property.block}, Lot ${property.lot}`
    },
  },
  {
    accessorKey: 'previous_reading',
    header: 'Previous',
    cell: ({ row }) =>
      `${Number(row.original.previous_reading).toLocaleString()} cu.m.`,
  },
  {
    accessorKey: 'current_reading',
    header: 'Current',
    cell: ({ row }) =>
      `${Number(row.original.current_reading).toLocaleString()} cu.m.`,
  },
  {
    accessorKey: 'consumption',
    header: 'Consumption',
    cell: ({ row }) => (
      <span className="font-medium text-blue-600">
        {Number(row.original.consumption).toLocaleString()} cu.m.
      </span>
    ),
  },
]

interface WaterReadingsTableProps {
  readings: ReadingWithMeter[]
}

export function WaterReadingsTable({ readings }: WaterReadingsTableProps) {
  return (
    <DataTable
      columns={columns}
      data={readings}
      searchKey="reading_date"
      searchPlaceholder="Search by date..."
    />
  )
}
