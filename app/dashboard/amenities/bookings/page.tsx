
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { BookingsTable } from './bookings-table'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('amenity_bookings')
    .select(`
      *,
      amenity:amenities(name),
      property:properties(block, lot)
    `)
    .order('booking_date', { ascending: true })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Amenity Bookings"
        description="Manage facility reservations"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/amenities/bookings/new">
              <Plus className="mr-2 size-4" />
              New Booking
            </Link>
          </Button>
        }
      />

      <BookingsTable bookings={bookings || []} />
    </div>
  )
}
