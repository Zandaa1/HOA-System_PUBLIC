
import { createClient } from '@/lib/supabase/server'
import { DashboardCalendar } from '@/components/dashboard-calendar'

export default async function AmenityCalendarPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

  const { data: bookings } = await supabase
    .from('amenity_bookings')
    .select('id, booking_date, booked_by_name, start_time, end_time, status, amenity:amenities(name)')
    .gte('booking_date', firstStr)
    .lte('booking_date', lastStr)
    .neq('status', 'cancelled')
    .order('booking_date')

  const initialBookings = (bookings || []).map((b: any) => ({
    id: b.id,
    booking_date: String(b.booking_date).slice(0, 10),
    booked_by_name: b.booked_by_name,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    amenity_name: b.amenity?.name ?? null,
    amenity_color: null,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Amenity Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Visual schedule of bookings and availability
        </p>
      </div>
      <DashboardCalendar
        initialBookings={initialBookings}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  )
}
