'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Homeowner, Property } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { PropertySelectGroup } from '@/components/property-selector'

interface HomeownerFormProps {
  homeowner?: Homeowner
  properties: Property[]
}

export function HomeownerForm({ homeowner, properties }: HomeownerFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    property_id: homeowner?.property_id || '',
    first_name: homeowner?.first_name || '',
    last_name: homeowner?.last_name || '',
    middle_name: homeowner?.middle_name || '',
    email: homeowner?.email || '',
    phone: homeowner?.phone || '',
    secondary_phone: homeowner?.secondary_phone || '',
    is_residing: homeowner?.is_residing ?? true,
    move_in_date: homeowner?.move_in_date || '',
    emergency_contact_name: homeowner?.emergency_contact_name || '',
    emergency_contact_phone: homeowner?.emergency_contact_phone || '',
    notes: homeowner?.notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      property_id: formData.property_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      middle_name: formData.middle_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      secondary_phone: formData.secondary_phone || null,
      is_residing: formData.is_residing,
      move_in_date: formData.move_in_date || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      notes: formData.notes || null,
    }

    try {
      if (homeowner) {
        const { error } = await supabase
          .from('homeowners')
          .update(data)
          .eq('id', homeowner.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('homeowners').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/residents/homeowners')
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
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_phone">Secondary Phone</Label>
            <Input
              id="secondary_phone"
              value={formData.secondary_phone}
              onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PropertySelectGroup
            properties={properties}
            value={formData.property_id}
            onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="move_in_date">Move-in Date</Label>
            <Input
              id="move_in_date"
              type="date"
              value={formData.move_in_date}
              onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="is_residing"
              checked={formData.is_residing}
              onCheckedChange={(checked) => setFormData({ ...formData, is_residing: checked })}
            />
            <Label htmlFor="is_residing">Currently Residing</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Contact & Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
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
          "Ensure the homeowner's name matches their valid government ID.",
          "Email address is required for sending automated billing statements.",
          "Only one property can be primary if the homeowner owns multiple units.",
          "Emergency contact information is critical for security and medical response."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {homeowner ? 'Update Homeowner' : 'Register Homeowner'}
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
