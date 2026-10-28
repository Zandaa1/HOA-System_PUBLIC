
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { BookingManagementActions } from './booking-management-actions'
import { BOOKING_STATUS_COLORS } from '@/lib/constants'

const statusColors: Record<string, string> = {
  ...BOOKING_STATUS_COLORS,
  approved: BOOKING_STATUS_COLORS.confirmed || 'bg-status-paid-bg text-status-paid border-status-paid-border',
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('amenity_bookings')
    .select(`
      *,
      amenity:amenities(id, name, hourly_rate, half_day_rate, full_day_rate, deposit_amount),
      property:properties(id, block, lot, homeowners(first_name, last_name))
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  const amenity = booking.amenity as any
  const property = booking.property as any
  const homeowner = property?.homeowners?.[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/amenities/bookings">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Booking Details</h1>
          <Badge className={statusColors[booking.status]} variant="secondary">
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/amenities/bookings/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit Booking
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Booking Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amenity</span>
              <span className="font-medium">{amenity?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booked By</span>
              <span>{booking.booked_by_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{booking.booking_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{booking.start_time} – {booking.end_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration Type</span>
              <span className="capitalize">{booking.duration_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guests</span>
              <span>{booking.num_guests}</span>
            </div>
            {booking.purpose && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose</span>
                <span className="max-w-[200px] text-right">{booking.purpose}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-bold">₱{Number(booking.total_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposit Paid</span>
              <span className="text-green-600 font-medium">₱{Number(booking.deposit_paid).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Property & Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Block {property.block}, Lot {property.lot}
                </p>
                {homeowner && (
                  <p className="text-xs text-muted-foreground">
                    {homeowner.first_name} {homeowner.last_name}
                  </p>
                )}
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link href={`/dashboard/properties/${property.id}`}>View Property</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No property linked</p>
            )}

            <Separator />

            <BookingManagementActions
              bookingId={id}
              status={booking.status}
              bookingData={{
                propertyId: property?.id,
                amenityName: amenity?.name,
                bookingDate: String(booking.booking_date).slice(0, 10),
                totalAmount: Number(booking.total_amount),
                depositPaid: Number(booking.deposit_paid),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
