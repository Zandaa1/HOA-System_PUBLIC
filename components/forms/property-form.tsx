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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Property, PropertyType } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { LocationPicker } from '@/components/location-picker'
import { FormGuide } from '@/components/form-guide'

interface PropertyFormProps {
  property?: Property
  propertyTypes: PropertyType[]
}

export function PropertyForm({ property, propertyTypes }: PropertyFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const existingPhoto = property?.photo_url || null

  const [formData, setFormData] = useState({
    block: property?.block || '',
    lot: property?.lot || '',
    phase: property?.phase || '',
    street_address: property?.street_address || '',
    property_type_id: property?.property_type_id || '',
    lot_area_sqm: property?.lot_area_sqm?.toString() || '',
    floor_area_sqm: property?.floor_area_sqm?.toString() || '',
    latitude: property?.latitude?.toString() || '',
    longitude: property?.longitude?.toString() || '',
    status: property?.status || 'vacant',
    monthly_dues_override: property?.monthly_dues_override?.toString() || '',
      notes: property?.notes || '',
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      block: formData.block,
      lot: formData.lot,
      phase: formData.phase || null,
      street_address: formData.street_address || null,
      property_type_id: formData.property_type_id || null,
      lot_area_sqm: formData.lot_area_sqm ? parseFloat(formData.lot_area_sqm) : null,
      floor_area_sqm: formData.floor_area_sqm ? parseFloat(formData.floor_area_sqm) : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      status: formData.status as Property['status'],
      monthly_dues_override: formData.monthly_dues_override
        ? parseFloat(formData.monthly_dues_override)
        : null,
      notes: formData.notes || null,
    }

    let uploadedPath: string | null = null

    try {
      let photo_url = existingPhoto

      if (photoFile) {
        const uploaded = await uploadAppFile(photoFile, { directory: 'properties' })
        uploadedPath = uploaded.path
        photo_url = uploaded.path
      }

      const payload = {
        ...data,
        photo_url,
      }

      if (property) {
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', property.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('properties').insert(payload)
        if (error) throw error
      }

      if (uploadedPath && existingPhoto) {
        await deleteAppFile(existingPhoto)
      }

      router.push('/dashboard/properties')
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
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="block">Block *</Label>
                <Input
                  id="block"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lot">Lot *</Label>
                <Input
                  id="lot"
                  value={formData.lot}
                  onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Input
                  id="phase"
                  value={formData.phase}
                  onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property_type_id">Property Type</Label>
                <Select
                  value={formData.property_type_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, property_type_id: value })
                  }
                >
                  <SelectTrigger id="property_type_id">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="street_address">Street Address</Label>
                <Input
                  id="street_address"
                  value={formData.street_address}
                  onChange={(e) =>
                    setFormData({ ...formData, street_address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'occupied' | 'vacant' | 'for_sale' | 'for_rent' })}                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="for_sale">For Sale</SelectItem>
                    <SelectItem value="for_rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Measurements & Fees</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lot_area_sqm">Lot Area (sqm)</Label>
                <Input
                  id="lot_area_sqm"
                  type="number"
                  step="0.01"
                  value={formData.lot_area_sqm}
                  onChange={(e) =>
                    setFormData({ ...formData, lot_area_sqm: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor_area_sqm">Floor Area (sqm)</Label>
                <Input
                  id="floor_area_sqm"
                  type="number"
                  step="0.01"
                  value={formData.floor_area_sqm}
                  onChange={(e) =>
                    setFormData({ ...formData, floor_area_sqm: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="monthly_dues_override">Monthly Dues Override (₱)</Label>
                <Input
                  id="monthly_dues_override"
                  type="number"
                  step="0.01"
                  value={formData.monthly_dues_override}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_dues_override: e.target.value })
                  }
                  placeholder="Leave blank for default"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Any additional information about this property..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Exterior Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingPhoto && (
                <img
                  src={getFileUrl(existingPhoto)}
                  alt={`Exterior of Block ${formData.block || ''} Lot ${formData.lot || ''}`}
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
                {photoFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {photoFile.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Map Picker */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Map Location</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                onAddressSelect={(address) => setFormData((prev) => ({ ...prev, street_address: address }))}
                label="Pinpoint Location"
              />
            </CardContent>
          </Card>
          
          <FormGuide 
            notes={[
              "Ensure Block and Lot numbers match the official subdivision plan.",
              "Use 'Phase' to distinguish between different development stages.",
              "Status affects billing and gate access permissions.",
              "Monthly Dues Override should only be used for non-standard lot configurations."
            ]}
            className="mt-6"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {property ? 'Update Property' : 'Create Property'}
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
