'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

const METHODS = ['Cash', 'Check', 'Bank Transfer', 'GCash', 'Maya']

interface PropertyOption {
  id: string
  block: number
  lot: number
}

export function AdvanceDepositForm({ properties, defaultValues }: { properties: PropertyOption[]; defaultValues?: Partial<{ property_id: string; amount: number; deposit_date: string; payment_method: string | null; reference_number: string | null; remaining_balance: number; notes: string | null }> }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const amount = parseFloat(form.get('amount') as string)
    const payload = {
      property_id: form.get('property_id') as string,
      amount,
      deposit_date: form.get('deposit_date') as string,
      payment_method: (form.get('payment_method') as string) || null,
      reference_number: (form.get('reference_number') as string) || null,
      remaining_balance: defaultValues?.remaining_balance ?? amount,
      notes: (form.get('notes') as string) || null,
    }

    const supabase = createClient()
    const { error: err } = await supabase.from('advance_deposits').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/dashboard/billing/collections')
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property</Label>
              <Select name="property_id" defaultValue={defaultValues?.property_id}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      Block {p.block}, Lot {p.lot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₱)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={defaultValues?.amount || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit_date">Deposit Date</Label>
              <Input id="deposit_date" name="deposit_date" type="date" required defaultValue={defaultValues?.deposit_date || new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" defaultValue={defaultValues?.payment_method || undefined}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input id="reference_number" name="reference_number" placeholder="e.g. OR-2026-001" defaultValue={defaultValues?.reference_number || ''} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional notes" defaultValue={defaultValues?.notes || ''} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Add Deposit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
