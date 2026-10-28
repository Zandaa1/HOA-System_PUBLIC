'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tag, Loader2, AlertCircle } from 'lucide-react'

interface ApplyDiscountProps {
  invoiceId: string
  subtotal: number
}

export function ApplyDiscountForm({ invoiceId, subtotal }: ApplyDiscountProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')
  const [value, setValue] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const discountAmount =
    discountType === 'fixed'
      ? parseFloat(value || '0')
      : (subtotal * parseFloat(value || '0')) / 100

  const handleApply = () => {
    const numVal = parseFloat(value)
    if (!numVal || numVal <= 0) { setError('Enter a valid discount value.'); return }
    if (discountType === 'percentage' && numVal > 100) { setError('Percentage cannot exceed 100.'); return }
    if (!name.trim()) { setError('Enter a discount name/reason.'); return }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // 1. Record in discounts table
      await supabase.from('discounts').insert({
        name: name.trim(),
        discount_type: discountType,
        value: numVal,
        is_active: true,
      })

      // 2. Update invoice discount_amount and recalculate balance
      const { data: invoice } = await supabase
        .from('invoices')
        .select('subtotal, penalty_amount, amount_paid')
        .eq('id', invoiceId)
        .single()

      if (invoice) {
        const newTotal = Math.max(0,
          Number(invoice.subtotal) + Number(invoice.penalty_amount) - discountAmount
        )
        const newBalance = Math.max(0, newTotal - Number(invoice.amount_paid))
        const newStatus = newBalance <= 0 ? 'paid' : 'pending'

        await supabase
          .from('invoices')
          .update({
            discount_amount: discountAmount,
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
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="size-4 text-primary" />
        Apply Discount
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Discount Name / Reason</Label>
          <Input
            placeholder="e.g. Senior Citizen, Early Payment"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{discountType === 'fixed' ? 'Amount (₱)' : 'Percentage (%)'}</Label>
          <Input
            type="number"
            min="0"
            max={discountType === 'percentage' ? '100' : undefined}
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Computed Discount</Label>
          <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-bold text-destructive">
            - ₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      <Button onClick={handleApply} disabled={isPending} size="sm">
        {isPending ? <><Loader2 className="mr-2 size-4 animate-spin" /> Applying...</> : 'Apply Discount'}
      </Button>
    </div>
  )
}
