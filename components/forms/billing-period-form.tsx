'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BillingPeriod } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'

interface BillingPeriodFormProps {
  period?: BillingPeriod
}

export function BillingPeriodForm({ period }: BillingPeriodFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: period?.name || '',
    start_date: period?.start_date || '',
    end_date: period?.end_date || '',
    due_date: period?.due_date || '',
    is_closed: period?.is_closed ?? false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      due_date: formData.due_date,
      is_closed: formData.is_closed,
    }

    try {
      if (period) {
        const { error } = await supabase
          .from('billing_periods')
          .update(data)
          .eq('id', period.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('billing_periods').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/billing/periods')
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
          <CardTitle className="text-base">Billing Period Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Period Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. May 2026"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="is_closed"
              checked={formData.is_closed}
              onCheckedChange={(checked) => setFormData({ ...formData, is_closed: checked })}
            />
            <Label htmlFor="is_closed">Closed Period</Label>
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Billing periods typically cover one full calendar month.",
          "Closing a period prevents further modifications to invoices for that month.",
          "Ensure the due date allows enough time for residents to process payments.",
          "Overdue charges are calculated based on the due date of the active period."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {period ? 'Update Period' : 'Create Period'}
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
