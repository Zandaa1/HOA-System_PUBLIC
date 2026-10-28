/**
 * Shared constants and configuration for the HOA System Management Platform.
 */

export const PROPERTY_STATUS_COLORS: Record<string, string> = {
  occupied: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  vacant: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
  for_sale: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  for_rent: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  occupied_renter: 'bg-status-partial-bg text-status-partial border-status-partial-border',
}

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  for_sale: 'For Sale',
  for_rent: 'For Rent',
  occupied_renter: 'Occupied (Renter)',
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  paid: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  overdue: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
  partial: 'bg-status-partial-bg text-status-partial border-status-partial-border',
}

export const CASH_ADVANCE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
  pending_approval: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  approved: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  released: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  partially_liquidated: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  liquidated: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  cancelled: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
}

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  confirmed: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  completed: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  partial: 'Partially Paid',
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const CASH_ADVANCE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  released: 'Released',
  partially_liquidated: 'Partially Liquidated',
  liquidated: 'Liquidated',
  cancelled: 'Cancelled',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
  other: 'Other',
}

export const MAP_DEFAULTS = {
  lat: 0.001,
  lng: 0.001,
  zoom: 16,
}
