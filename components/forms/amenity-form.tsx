'use client'

import { getErrorMessage } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'
import { getFileUrl } from '@/lib/storage/shared'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Amenity } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { LocationPicker } from '@/components/location-picker'
import { FormGuide } from '@/components/form-guide'

interface AmenityFormProps {
  amenity?: Amenity
}

export function AmenityForm({ amenity }: AmenityFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const existingPhoto = amenity?.photo_url || null

  const [formData, setFormData] = useState({
    name: amenity?.name || '',
    description: amenity?.description || '',
    location: amenity?.location || '',
    capacity: amenity?.capacity?.toString() || '',
    hourly_rate: amenity?.hourly_rate?.toString() || '0',
    half_day_rate: amenity?.half_day_rate?.toString() || '0',
    full_day_rate: amenity?.full_day_rate?.toString() || '0',
    requires_deposit: amenity?.requires_deposit ?? false,
    deposit_amount: amenity?.deposit_amount?.toString() || '0',
    rules: amenity?.rules || '',
    is_active: amenity?.is_active ?? true,
    latitude: amenity?.latitude?.toString() || '',
    longitude: amenity?.longitude?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    let uploadedPath: string | null = null

    try {
      let photo_url = existingPhoto

      if (photoFile) {
        const uploaded = await uploadAppFile(photoFile, { directory: 'amenities' })
        uploadedPath = uploaded.path
        photo_url = uploaded.path
      }

      const data = {
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        hourly_rate: parseFloat(formData.hourly_rate),
        half_day_rate: parseFloat(formData.half_day_rate),
        full_day_rate: parseFloat(formData.full_day_rate),
        requires_deposit: formData.requires_deposit,
        deposit_amount: parseFloat(formData.deposit_amount),
        rules: formData.rules || null,
        is_active: formData.is_active,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        photo_url,
      }

      if (amenity) {
        const { error } = await supabase
          .from('amenities')
          .update(data)
          .eq('id', amenity.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('amenities').insert(data)
        if (error) throw error
      }

      if (uploadedPath && existingPhoto) {
        await deleteAppFile(existingPhoto)
      }

      router.push('/dashboard/amenities')
      router.refresh()
    } catch (err) {
      await deleteAppFile(uploadedPath).catch(() => {})
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Amenity Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Amenity Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Amenity Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="location">Location (Text Description)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Near the main gate"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (pax)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Available for Booking</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Facility Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingPhoto && (
                <img
                  src={getFileUrl(existingPhoto)}
                  alt={formData.name}
                  className="h-48 w-full rounded-md border object-cover"
                />
              )}
              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">
                  High quality images recommended for the booking portal.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rates & Deposits</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (₱)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="half_day_rate">Half Day Rate (₱)</Label>
                <Input
                  id="half_day_rate"
                  type="number"
                  step="0.01"
                  value={formData.half_day_rate}
                  onChange={(e) => setFormData({ ...formData, half_day_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_day_rate">Full Day Rate (₱)</Label>
                <Input
                  id="full_day_rate"
                  type="number"
                  step="0.01"
                  value={formData.full_day_rate}
                  onChange={(e) => setFormData({ ...formData, full_day_rate: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-4 sm:col-span-1 lg:col-span-1">
                <Switch
                  id="requires_deposit"
                  checked={formData.requires_deposit}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_deposit: checked })}
                />
                <Label htmlFor="requires_deposit">Requires Deposit</Label>
              </div>
              <div className="space-y-2 sm:col-span-1 lg:col-span-2">
                <Label htmlFor="deposit_amount">Deposit Amount (₱)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  disabled={!formData.requires_deposit}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rules & Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="rules">Rules</Label>
                <Textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  rows={4}
                  placeholder="List rules for using this amenity..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Map Picker */}
        <div className="lg:sticky lg:top-6 h-fit space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Map Location</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker
                label="Pinpoint Amenity on Map"
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                onAddressSelect={(address) => setFormData((prev) => ({ ...prev, location: address }))}
              />
            </CardContent>
          </Card>

          <FormGuide 
            notes={[
              "Amenity names should be unique and easily recognizable.",
              "Rate changes only affect future bookings.",
              "Check 'Requires Deposit' to enable the deposit amount field.",
              "Rules and Guidelines will be displayed on the resident booking portal."
            ]}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {amenity ? 'Update Amenity' : 'Create Amenity'}
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
