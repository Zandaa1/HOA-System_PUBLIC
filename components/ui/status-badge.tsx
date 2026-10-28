import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PROPERTY_STATUS_COLORS,
  PROPERTY_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
} from '@/lib/constants'

type StatusType = 'property' | 'invoice' | 'booking'

interface StatusBadgeProps extends React.ComponentPropsWithoutRef<typeof Badge> {
  type: StatusType
  status: string
}

const colorMaps: Record<StatusType, Record<string, string>> = {
  property: PROPERTY_STATUS_COLORS,
  invoice: INVOICE_STATUS_COLORS,
  booking: BOOKING_STATUS_COLORS,
}

const labelMaps: Record<StatusType, Record<string, string>> = {
  property: PROPERTY_STATUS_LABELS,
  invoice: INVOICE_STATUS_LABELS,
  booking: BOOKING_STATUS_LABELS,
}

export function StatusBadge({ 
  type, 
  status, 
  className, 
  ...props 
}: StatusBadgeProps) {
  const colorClass = colorMaps[type][status] || 'bg-gray-100 text-gray-700'
  const label = labelMaps[type][status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')

  return (
    <Badge
      variant="secondary"
      className={cn('capitalize font-medium border', colorClass, className)}
      {...props}
    >
      {label}
    </Badge>
  )
}
