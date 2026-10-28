'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import { BankAccount } from '@/lib/types/database'

interface AdvanceFormProps {
  bankAccounts: BankAccount[]
}

export function AdvanceForm({ bankAccounts }: AdvanceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    advance_type: 'staff' as 'staff' | 'pcf',
    grantee_name: '',
    grantee_role: '',
    purpose: '',
    requested_amount: '',
    source_bank_account_id: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const amount = parseFloat(formData.requested_amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid requested amount greater than 0.')
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const year = new Date().getFullYear()
    const rand = Math.floor(1000 + Math.random() * 9000)
    const referenceNumber = `CA-${year}-${rand}`

    try {
      const { error: insertError } = await supabase.from('cash_advances').insert({
        reference_number: referenceNumber,
        advance_type: formData.advance_type,
        grantee_name: formData.grantee_name.trim(),
        grantee_role: formData.grantee_role.trim() || null,
        purpose: formData.purpose.trim(),
        requested_amount: amount,
        source_bank_account_id: formData.source_bank_account_id || null,
        notes: formData.notes.trim() || null,
        status: 'pending_approval',
      })

      if (insertError) throw insertError

      router.push('/dashboard/billing/cash-advances')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the request.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle setting default grantee/role when switching to PCF
  const handleTypeChange = (val: 'staff' | 'pcf') => {
    if (val === 'pcf') {
      setFormData({
        ...formData,
        advance_type: val,
        grantee_name: 'Ms. Tess', // Default PCF custodian
        grantee_role: 'PCF Custodian',
        purpose: 'PCF Replenishment Drawdown',
      })
    } else {
      setFormData({
        ...formData,
        advance_type: val,
        grantee_name: '',
        grantee_role: '',
        purpose: '',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card className="shadow-sm border-muted/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Request Cash Advance</CardTitle>
          <CardDescription>
            Submit a cash advance request for staff operational expenses or PCF custodian drawdowns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="advance_type">Advance Type</Label>
            <Select
              value={formData.advance_type}
              onValueChange={(val) => handleTypeChange(val as 'staff' | 'pcf')}
            >
              <SelectTrigger id="advance_type" className="h-10">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff/Officer Advance</SelectItem>
                <SelectItem value="pcf">Petty Cash Fund (PCF) Custodian Advance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grantee & Role */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grantee_name">Grantee Name *</Label>
              <Input
                id="grantee_name"
                value={formData.grantee_name}
                onChange={(e) => setFormData({ ...formData, grantee_name: e.target.value })}
                required
                placeholder="e.g. Abbygail Mangulabnan"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grantee_role">Grantee Role / Designation</Label>
              <Input
                id="grantee_role"
                value={formData.grantee_role}
                onChange={(e) => setFormData({ ...formData, grantee_role: e.target.value })}
                placeholder="e.g. Treasurer"
                className="h-10"
              />
            </div>
          </div>

          {/* Amount & Source Account */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requested_amount">Requested Amount (₱) *</Label>
              <Input
                id="requested_amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.requested_amount}
                onChange={(e) => setFormData({ ...formData, requested_amount: e.target.value })}
                required
                placeholder="0.00"
                className="h-10 font-mono font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_bank_account_id">Source Fund Account</Label>
              <Select
                value={formData.source_bank_account_id}
                onValueChange={(val) => setFormData({ ...formData, source_bank_account_id: val })}
              >
                <SelectTrigger id="source_bank_account_id" className="h-10">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="font-medium">
                      {acc.name} ({acc.type.replace('_', ' ')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Advance *</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
              placeholder="e.g. Purchase of office supplies for May"
              className="h-10"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add details, instructions or comments here..."
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm font-semibold bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isLoading} className="h-10 font-bold px-6">
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-10 px-6 font-semibold"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
