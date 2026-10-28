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
import { ViolationCategory } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'

interface ViolationCategoryFormProps {
  category?: ViolationCategory
}

export function ViolationCategoryForm({ category }: ViolationCategoryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    fine_amount: category?.fine_amount?.toString() || '0',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      name: formData.name,
      description: formData.description || null,
      fine_amount: formData.fine_amount ? parseFloat(formData.fine_amount) : 0,
    }

    try {
      if (category) {
        const { error } = await supabase
          .from('violation_categories')
          .update(data)
          .eq('id', category.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('violation_categories').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/violations')
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
            Category Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Unauthorized Parking, Noise Complaint"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fine_amount">Baseline Fine (₱)</Label>
            <Input
              id="fine_amount"
              type="number"
              step="0.01"
              placeholder="e.g. 500.00"
              value={formData.fine_amount}
              onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Guidelines / Description</Label>
            <Textarea
              id="description"
              placeholder="Provide context or rules governing this violation category..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
          onClick={() => router.push('/dashboard/violations')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {category ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </form>
  )
}
