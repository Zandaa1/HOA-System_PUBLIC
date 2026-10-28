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
import { BankAccount } from '@/lib/types/database'

const CATEGORIES = ['Bank Interest', 'Other']
const METHODS = ['Bank Transfer', 'Cash', 'Check', 'GCash', 'Maya', 'Other']

export function NonInvoiceEditForm({
  item,
  bankAccounts,
}: {
  item: {
    id: string
    receipt_number: string | null
    category: string
    amount: number
    payment_date: string
    payment_method: string
    bank_account_id: string
    notes: string | null
  }
  bankAccounts: BankAccount[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const payload = {
      receipt_number: (form.get('receipt_number') as string) || null,
      category: form.get('category') as string,
      amount: parseFloat(form.get('amount') as string),
      payment_date: form.get('payment_date') as string,
      payment_method: form.get('payment_method') as string,
      bank_account_id: form.get('bank_account_id') as string,
      notes: (form.get('notes') as string) || null,
    }

    if (!payload.bank_account_id) {
      setError('Please select a deposit account.')
      setSaving(false)
      return
    }
    if (!payload.payment_method) {
      setError('Please select a payment method.')
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { error: err } = await supabase.from('non_invoice_collections').update(payload).eq('id', item.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push(`/dashboard/billing/collections/non-invoice/${item.id}`)
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receipt_number">Receipt Number</Label>
              <Input id="receipt_number" name="receipt_number" placeholder="e.g. OR-2026-001" defaultValue={item.receipt_number || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={item.category}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₱)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={item.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Date</Label>
              <Input id="payment_date" name="payment_date" type="date" required defaultValue={item.payment_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" defaultValue={item.payment_method}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account_id">Deposit Account</Label>
              <Select name="bank_account_id" defaultValue={item.bank_account_id}>
                <SelectTrigger id="bank_account_id"><SelectValue placeholder="Select deposit account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                      {account.bank_name ? ` - ${account.bank_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional notes" defaultValue={item.notes || ''} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Collection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
