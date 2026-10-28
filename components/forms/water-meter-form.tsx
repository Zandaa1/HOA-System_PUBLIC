'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { WaterMeter } from '@/lib/types/database'
import { PropertySelectGroup } from '@/components/property-selector'

interface WaterMeterFormProps {
  properties: { id: string; block: string; lot: string }[]
  meter?: WaterMeter
}

export function WaterMeterForm({ properties, meter }: WaterMeterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    property_id: meter?.property_id || '',
    meter_number: meter?.meter_number || '',
    installation_date: meter?.installation_date || new Date().toISOString().split('T')[0],
    last_reading_value: meter ? String(meter.last_reading_value) : '0',
    notes: meter?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      property_id: formData.property_id,
      meter_number: formData.meter_number,
      installation_date: formData.installation_date || null,
      last_reading_value: parseFloat(formData.last_reading_value),
      notes: formData.notes || null,
    }

    try {
      const { error } = meter
        ? await supabase.from('water_meters').update(data).eq('id', meter.id)
        : await supabase.from('water_meters').insert(data)
      if (error) throw error

      router.push('/dashboard/water')
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
          <CardTitle className="text-base font-semibold">Meter Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PropertySelectGroup
            properties={properties}
            value={formData.property_id}
            onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            required
          />

          <div className="space-y-2">
            <Label htmlFor="meter_number">Meter Number *</Label>
            <Input
              id="meter_number"
              value={formData.meter_number}
              onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
              required
              placeholder="e.g., SPV-WM-101"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="installation_date">Installation Date</Label>
            <Input
              id="installation_date"
              type="date"
              value={formData.installation_date}
              onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_reading_value">Initial Reading (m³)</Label>
            <Input
              id="last_reading_value"
              type="number"
              step="0.01"
              value={formData.last_reading_value}
              onChange={(e) => setFormData({ ...formData, last_reading_value: e.target.value })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any remarks about the meter or installation"
            />
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Meter numbers should match the physical serial number of the device.",
          "Initial reading is used as the starting point for the first consumption bill.",
          "Only one active water meter should be assigned per property.",
          "Installation date helps in tracking the age and maintenance cycle of the meter."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {meter ? 'Update Meter' : 'Add Meter'}
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
