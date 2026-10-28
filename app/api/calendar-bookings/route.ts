import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('amenity_bookings')
    .select('id, booking_date, booked_by_name, start_time, end_time, status, amenity:amenities(name)')
    .gte('booking_date', from)
    .lte('booking_date', to)
    .neq('status', 'cancelled')
    .order('booking_date')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const bookings = (data || []).map((b) => ({
    id: b.id,
    booking_date: String(b.booking_date).slice(0, 10),
    booked_by_name: b.booked_by_name,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    amenity_name: (b.amenity as any)?.name ?? null,
    amenity_color: null,
  }))

  return NextResponse.json(bookings)
}
