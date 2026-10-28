
import { createClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/forms/booking-form'

export default async function NewBookingPage() {
  const supabase = await createClient()

  const [{ data: amenities }, { data: properties }] = await Promise.all([
    supabase
      .from('amenities')
      .select('id, name, hourly_rate, half_day_rate, full_day_rate')
      .eq('is_active', true)
      .order('name'),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Create a facility reservation
        </p>
      </div>

      <BookingForm 
        amenities={amenities || []} 
        properties={properties || []} 
      />
    </div>
  )
}
