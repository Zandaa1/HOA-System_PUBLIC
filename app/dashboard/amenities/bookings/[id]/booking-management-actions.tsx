'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, Trash2, XCircle } from 'lucide-react'

interface BookingManagementActionsProps {
  bookingId: string
  status: string
  bookingData: {
    propertyId?: string
    amenityName?: string
    bookingDate: string
    totalAmount: number
    depositPaid: number
  }
}

export function BookingManagementActions({
  bookingId,
  status,
  bookingData,
}: BookingManagementActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('amenity_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      if (updateError) {
        setError('Failed to confirm booking.')
        return
      }

      if (bookingData.propertyId && bookingData.totalAmount > 0) {
        const invoiceNumber = `AMN-${Date.now().toString(36).toUpperCase()}`
        const amountDue = Math.max(0, bookingData.totalAmount - bookingData.depositPaid)

        const { data: invoice, error: invError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            property_id: bookingData.propertyId,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: bookingData.bookingDate,
            subtotal: amountDue,
            total_amount: amountDue,
            balance: amountDue,
            status: amountDue <= 0 ? 'paid' : 'pending',
            notes: `Amenity booking: ${bookingData.amenityName || 'Facility'} on ${bookingData.bookingDate}`,
          })
          .select('id')
          .single()

        if (!invError && invoice) {
          await supabase.from('invoice_items').insert({
            invoice_id: invoice.id,
            description: `${bookingData.amenityName || 'Amenity'} Booking — ${bookingData.bookingDate}`,
            quantity: 1,
            unit_price: amountDue,
            amount: amountDue,
          })
        }
      }

      router.refresh()
    })
  }

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: cancelError } = await supabase
        .from('amenity_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
      if (cancelError) {
        setError('Failed to cancel booking.')
        return
      }
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this booking? This cannot be undone.')) return
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('amenity_bookings')
        .delete()
        .eq('id', bookingId)
      if (deleteError) {
        setError('Failed to delete booking.')
        return
      }
      router.push('/dashboard/amenities/bookings')
      router.refresh()
    })
  }

  const canDelete = status === 'pending' || status === 'cancelled'

  return (
    <div className="space-y-2">
      {status === 'pending' && (
        <Button onClick={handleConfirm} disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 size-4" /> Confirm & Generate Invoice
            </>
          )}
        </Button>
      )}
      {status === 'pending' && (
        <Button variant="outline" onClick={handleCancel} disabled={isPending} className="w-full">
          <XCircle className="mr-2 size-4" />
          Cancel Booking
        </Button>
      )}
      {canDelete && (
        <Button variant="destructive" onClick={handleDelete} disabled={isPending} className="w-full">
          <Trash2 className="mr-2 size-4" />
          Delete Booking
        </Button>
      )}
      {status === 'confirmed' && (
        <div className="flex items-center gap-2 text-sm text-green-700 p-2 bg-green-50 rounded-md">
          <CheckCircle className="size-4" />
          Booking confirmed. Invoice has been generated.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3" /> {error}
        </div>
      )}
    </div>
  )
}
