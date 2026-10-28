'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'

interface ConfirmBookingButtonProps {
  bookingId: string
  bookingData: {
    propertyId?: string
    amenityName?: string
    bookingDate: string
    totalAmount: number
    depositPaid: number
  }
}

export function ConfirmBookingButton({ bookingId, bookingData }: ConfirmBookingButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const supabase = createClient()

      // 1. Update booking status to confirmed
      const { error: updateError } = await supabase
        .from('amenity_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      if (updateError) {
        setError('Failed to confirm booking.')
        return
      }

      // 2. Auto-generate invoice if property is linked and amount > 0
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
          // Create line item
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

  return (
    <div className="space-y-2">
      <Button onClick={handleConfirm} disabled={isPending} className="w-full">
        {isPending ? (
          <><Loader2 className="mr-2 size-4 animate-spin" /> Confirming...</>
        ) : (
          <><CheckCircle className="mr-2 size-4" /> Confirm & Generate Invoice</>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3" /> {error}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        This will confirm the booking and automatically create an invoice for the remaining balance.
      </p>
    </div>
  )
}
