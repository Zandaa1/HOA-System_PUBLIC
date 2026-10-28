'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { AmenityBooking } from '@/lib/types/database'
import { PropertySelectGroup } from '@/components/property-selector'

interface BookingFormProps {
  amenities: {
    id: string
    name: string
    hourly_rate: number
    half_day_rate: number
    full_day_rate: number
  }[]
  properties: { id: string; block: string; lot: string }[]
  booking?: AmenityBooking
}

export function BookingForm({ amenities, properties, booking }: BookingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    amenity_id: booking?.amenity_id || '',
    property_id: booking?.property_id || '',
    booked_by_name: booking?.booked_by_name || '',
    booking_date: booking?.booking_date || new Date().toISOString().split('T')[0],
    start_time: booking?.start_time || '08:00',
    end_time: booking?.end_time || '10:00',
    duration_type: booking?.duration_type || 'hourly',
    num_guests: booking?.num_guests?.toString() || '1',
    purpose: booking?.purpose || '',
    notes: booking?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    if (formData.start_time >= formData.end_time) {
      setError('End time must be later than start time.')
      setIsLoading(false)
      return
    }

    // Calculate total amount based on duration and amenity rate
    const selectedAmenity = amenities.find(a => a.id === formData.amenity_id)
    const rate = selectedAmenity?.hourly_rate || 0
    const start = parseInt(formData.start_time.split(':')[0])
    const end = parseInt(formData.end_time.split(':')[0])
    const hours = Math.max(1, end - start)
    const total_amount =
      formData.duration_type === 'half_day'
        ? selectedAmenity?.half_day_rate || 0
        : formData.duration_type === 'full_day'
          ? selectedAmenity?.full_day_rate || 0
          : hours * rate

    const { data: conflicts, error: conflictError } = await supabase
      .from('amenity_bookings')
      .select('id, start_time, end_time')
      .eq('amenity_id', formData.amenity_id)
      .eq('booking_date', formData.booking_date)
      .in('status', ['pending', 'confirmed', 'approved'])

    if (conflictError) {
      setError(conflictError.message)
      setIsLoading(false)
      return
    }

    const hasOverlap = (conflicts || []).some((c) => {
      if (booking && c.id === booking.id) return false
      return formData.start_time < c.end_time && formData.end_time > c.start_time
    })

    if (hasOverlap) {
      setError('This amenity is already booked for the selected date and time range.')
      setIsLoading(false)
      return
    }

    const data = {
      amenity_id: formData.amenity_id,
      property_id: formData.property_id || null,
      booked_by_name: formData.booked_by_name,
      booking_date: formData.booking_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      duration_type: formData.duration_type as AmenityBooking['duration_type'],
      num_guests: parseInt(formData.num_guests),
      purpose: formData.purpose || null,
      notes: formData.notes || null,
      total_amount,
      status: booking?.status || 'pending',
    }

    try {
      if (booking) {
        const { error } = await supabase
          .from('amenity_bookings')
          .update(data)
          .eq('id', booking.id)
        if (error) throw error
        router.push(`/dashboard/amenities/bookings/${booking.id}`)
      } else {
        const { error } = await supabase.from('amenity_bookings').insert(data)
        if (error) throw error
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amenity_id">Facility *</Label>
            <Select 
              value={formData.amenity_id} 
              onValueChange={(value) => setFormData({ ...formData, amenity_id: value })}
              required
            >
              <SelectTrigger id="amenity_id">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {amenities.map((amenity) => (
                  <SelectItem key={amenity.id} value={amenity.id}>
                    {amenity.name} (₱{amenity.hourly_rate}/hr · ₱{amenity.half_day_rate}/half day · ₱{amenity.full_day_rate}/full day)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PropertySelectGroup
            properties={properties}
            value={formData.property_id}
            onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            blockLabel="Associated Property Block"
            lotLabel="Associated Property Lot"
            optional
          />

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="booked_by_name">Booked By (Full Name) *</Label>
            <Input
              id="booked_by_name"
              value={formData.booked_by_name}
              onChange={(e) => setFormData({ ...formData, booked_by_name: e.target.value })}
              required
              placeholder="Enter name of resident or representative"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_date">Date *</Label>
            <Input
              id="booking_date"
              type="date"
              value={formData.booking_date}
              onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_type">Charge Type *</Label>
            <Select
              value={formData.duration_type}
              onValueChange={(value) =>
                setFormData({ ...formData, duration_type: value as 'hourly' | 'half_day' | 'full_day' })
              }
            >
              <SelectTrigger id="duration_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="full_day">Full Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="num_guests">Number of Guests</Label>
            <Input
              id="num_guests"
              type="number"
              value={formData.num_guests}
              onChange={(e) => setFormData({ ...formData, num_guests: e.target.value })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g., Birthday Party"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Bookings are subject to facility availability and subdivision rules.",
          "Total amount is calculated by selected charge type (hourly, half day, full day).",
          "Associated property helps in identifying the resident responsible for the booking.",
          "Ensure start and end times do not overlap with existing confirmed bookings."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {booking ? 'Update Booking' : 'Create Booking'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
