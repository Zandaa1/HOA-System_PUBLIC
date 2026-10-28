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
import { Renter, Property } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { PropertySelectGroup } from '@/components/property-selector'

interface RenterFormProps {
  renter?: Renter
  properties: Property[]
}

export function RenterForm({ renter, properties }: RenterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    property_id: renter?.property_id || '',
    first_name: renter?.first_name || '',
    last_name: renter?.last_name || '',
    middle_name: renter?.middle_name || '',
    email: renter?.email || '',
    phone: renter?.phone || '',
    lease_start: renter?.lease_start || '',
    lease_end: renter?.lease_end || '',
    is_active: renter?.is_active ?? true,
    notes: renter?.notes || '',
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
      lease_start: formData.lease_start || null,
      lease_end: formData.lease_end || null,
      is_active: formData.is_active,
      notes: formData.notes || null,
    }

    try {
      if (renter) {
        const { error } = await supabase
          .from('renters')
          .update(data)
          .eq('id', renter.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('renters').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/residents/renters')
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
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Lease</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lease Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PropertySelectGroup
            properties={properties}
            value={formData.property_id}
            onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="lease_start">Lease Start</Label>
            <Input
              id="lease_start"
              type="date"
              value={formData.lease_start}
              onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lease_end">Lease End</Label>
            <Input
              id="lease_end"
              type="date"
              value={formData.lease_end}
              onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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
          "Renter information is required for issuing temporary gate passes.",
          "Lease end dates are used to automatically disable gate access.",
          "Ensure the homeowner has approved the registration of this tenant."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {renter ? 'Update Renter' : 'Register Renter'}
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
