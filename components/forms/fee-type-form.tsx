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
import { FeeType } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'

interface FeeTypeFormProps {
  feeType?: FeeType
}

export function FeeTypeForm({ feeType }: FeeTypeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: feeType?.name || '',
    description: feeType?.description || '',
    default_amount: feeType?.default_amount?.toString() || '',
    recurrence: feeType?.recurrence || 'monthly',
    is_active: feeType?.is_active ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      name: formData.name,
      description: formData.description || null,
      default_amount: formData.default_amount ? parseFloat(formData.default_amount) : 0,
      recurrence: formData.recurrence,
      is_active: formData.is_active,
    }

    try {
      if (feeType) {
        const { error } = await supabase
          .from('fee_types')
          .update(data)
          .eq('id', feeType.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('fee_types').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/billing/fee-types')
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
          <CardTitle className="text-base">Fee Type Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Fee Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_amount">Default Amount (₱)</Label>
            <Input
              id="default_amount"
              type="number"
              step="0.01"
              value={formData.default_amount}
              onChange={(e) => setFormData({ ...formData, default_amount: e.target.value })}
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
          <div className="flex items-center gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) => setFormData({ ...formData, recurrence: value as 'monthly' | 'yearly' | 'one_time' })}
              >
                <SelectTrigger id="recurrence" className="h-9 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-5">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Monthly fees are added to each month's invoices automatically.",
          "Yearly fees generate a single annual invoice per property.",
          "One-time fees are charged once (e.g. Construction Bond, Violation Fee).",
          "Deactivating a fee type prevents it from being selected in new invoices.",
          "The 'Default Amount' can be manually overridden when creating an invoice item.",
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {feeType ? 'Update Fee Type' : 'Create Fee Type'}
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
