'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PropertyType } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'

interface PropertyTypeFormProps {
  propertyType?: PropertyType
}

export function PropertyTypeForm({ propertyType }: PropertyTypeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: propertyType?.name || '',
    description: propertyType?.description || '',
    default_monthly_dues: propertyType?.default_monthly_dues?.toString() || '0',
    color: propertyType?.color || '#3b82f6',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      name: formData.name,
      description: formData.description || null,
      default_monthly_dues: parseFloat(formData.default_monthly_dues),
      color: formData.color,
    }

    try {
      if (propertyType) {
        const { error } = await supabase
          .from('property_types')
          .update(data)
          .eq('id', propertyType.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('property_types').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/properties/types')
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
          <CardTitle className="text-base">Type Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Type Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Residential"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_monthly_dues">Default Monthly Dues (₱)</Label>
            <Input
              id="default_monthly_dues"
              type="number"
              step="0.01"
              value={formData.default_monthly_dues}
              onChange={(e) => setFormData({ ...formData, default_monthly_dues: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Label Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                className="w-12 p-1 h-9"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#000000"
              />
            </div>
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
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Property types define the default monthly dues for all linked properties.",
          "Color labels are used in the dashboard map and reports for quick identification.",
          "Changes to default dues will not automatically update existing 'Monthly Dues Override' values.",
          "Common types include Residential, Commercial, and Open Space."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {propertyType ? 'Update Type' : 'Create Type'}
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
