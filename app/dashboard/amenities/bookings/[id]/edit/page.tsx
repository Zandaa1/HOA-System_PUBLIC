
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookingForm } from '@/components/forms/booking-form'

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: booking }, { data: amenities }, { data: properties }] = await Promise.all([
    supabase.from('amenity_bookings').select('*').eq('id', id).single(),
    supabase
      .from('amenities')
      .select('id, name, hourly_rate, half_day_rate, full_day_rate')
      .order('name'),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!booking) notFound()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Booking</h1>
        <p className="text-sm text-muted-foreground">
          Update reservation for {booking.booked_by_name}
        </p>
      </div>

      <BookingForm
        amenities={amenities || []}
        properties={properties || []}
        booking={booking}
      />
    </div>
  )
}
