'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Loader2, AlertCircle } from 'lucide-react'

interface ApplyPenaltyProps {
  invoiceId: string
  balance: number
}

export function ApplyPenaltyForm({ invoiceId, balance }: ApplyPenaltyProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [penaltyType, setPenaltyType] = useState<'fixed' | 'percentage'>('fixed')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('Late payment penalty')
  const [error, setError] = useState<string | null>(null)

  // Calculate penalty amount
  // Comment: for percentage, apply against the outstanding balance (not total)
  const penaltyAmount =
    penaltyType === 'fixed'
      ? parseFloat(value || '0')
      : (balance * parseFloat(value || '0')) / 100

  const handleApply = () => {
    const numVal = parseFloat(value)
    if (!numVal || numVal <= 0) { setError('Enter a valid penalty value.'); return }
    if (penaltyType === 'percentage' && numVal > 100) { setError('Percentage cannot exceed 100.'); return }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // 1. Insert penalty record
      await supabase.from('penalties').insert({
        invoice_id: invoiceId,
        penalty_type: 'late_fee',
        amount: penaltyAmount,
        applied_date: new Date().toISOString().split('T')[0],
        description: description.trim() || 'Late payment penalty',
      })

      // 2. Update invoice penalty_amount, total, and balance
      const { data: invoice } = await supabase
        .from('invoices')
        .select('subtotal, discount_amount, penalty_amount, amount_paid')
        .eq('id', invoiceId)
        .single()

      if (invoice) {
        const newPenalty = Number(invoice.penalty_amount) + penaltyAmount
        const newTotal = Number(invoice.subtotal) - Number(invoice.discount_amount) + newPenalty
        const newBalance = Math.max(0, newTotal - Number(invoice.amount_paid))
        const newStatus = newBalance <= 0 ? 'paid' : 'overdue'

        await supabase
          .from('invoices')
          .update({
            penalty_amount: newPenalty,
            total_amount: newTotal,
            balance: newBalance,
            status: newStatus,
          })
          .eq('id', invoiceId)
      }

      router.refresh()
    })
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
        <AlertTriangle className="size-4" />
        Apply Late Fee / Penalty
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            placeholder="Late payment penalty"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Penalty Type</Label>
          <Select value={penaltyType} onValueChange={(v) => setPenaltyType(v as 'fixed' | 'percentage')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
              <SelectItem value="percentage">% of Outstanding Balance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{penaltyType === 'fixed' ? 'Amount (₱)' : 'Percentage (%)'}</Label>
          <Input
            type="number"
            min="0"
            max={penaltyType === 'percentage' ? '100' : undefined}
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Computed Penalty</Label>
          <div className="h-9 flex items-center px-3 border rounded-md bg-status-pending-bg border-status-pending-border text-sm font-bold text-status-pending">
            + ₱{penaltyAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <Button onClick={handleApply} disabled={isPending} size="sm" variant="outline" className="border-status-pending-border text-status-pending hover:bg-status-pending-bg">
        {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" /> Applying...</> : 'Apply Penalty'}
      </Button>
    </div>
  )
}
