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
import { MaintenanceVendor } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'

interface MaintenanceVendorFormProps {
  vendor?: MaintenanceVendor
}

export function MaintenanceVendorForm({ vendor }: MaintenanceVendorFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    specialty: vendor?.specialty || 'General',
    contact_person: vendor?.contact_person || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    status: vendor?.status || 'active',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      name: formData.name,
      specialty: formData.specialty,
      contact_person: formData.contact_person || null,
      phone: formData.phone || null,
      email: formData.email || null,
      status: formData.status as any,
    }

    try {
      if (vendor) {
        const { error } = await supabase
          .from('maintenance_vendors')
          .update(data)
          .eq('id', vendor.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('maintenance_vendors').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/maintenance/vendors')
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
            Vendor details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Quezon City Plumbing Solutions"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty *</Label>
            <Select
              value={formData.specialty}
              onValueChange={(val) => setFormData({ ...formData, specialty: val })}
            >
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Carpentry">Carpentry/Masonry</SelectItem>
                <SelectItem value="Landscaping">Landscaping/Gardening</SelectItem>
                <SelectItem value="General">General Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              placeholder="e.g. John Doe"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g. Not configured"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. vendor@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Availability Status</Label>
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active / Available</SelectItem>
                <SelectItem value="inactive">Inactive / Blacklisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/maintenance/vendors')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {vendor ? 'Save Changes' : 'Register Vendor'}
        </Button>
      </div>
    </form>
  )
}
