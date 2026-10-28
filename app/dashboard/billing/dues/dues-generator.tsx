'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

interface PropertyType {
  id: string
  name: string
  default_monthly_dues: number
  color: string
}

interface BillingPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  due_date: string
}

interface FeeType {
  id: string
  name: string
  default_amount: number
}

interface DuesGeneratorProps {
  propertyTypes: PropertyType[]
  billingPeriods: BillingPeriod[]
  dueFeeType: FeeType | null
}

export function DuesGenerator({ propertyTypes, billingPeriods, dueFeeType }: DuesGeneratorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(propertyTypes.map((t) => t.id))
  const [overrideAmount, setOverrideAmount] = useState('')
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleGenerate = () => {
    if (!selectedPeriod) { setError('Select a billing period first.'); return }
    if (selectedTypes.length === 0) { setError('Select at least one property type.'); return }
    setError(null)
    setResult(null)

    startTransition(async () => {
      const supabase = createClient()

      // Get properties for selected types
      const { data: properties, error: propErr } = await supabase
        .from('properties')
        .select('id, property_type_id, monthly_dues_override, property_types(default_monthly_dues)')
        .in('property_type_id', selectedTypes)
        .neq('status', 'vacant')

      if (propErr || !properties) {
        setError('Failed to fetch properties.')
        return
      }

      // Get existing invoices for this period to avoid duplicates
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('property_id')
        .eq('billing_period_id', selectedPeriod)

      const existingPropertyIds = new Set(existingInvoices?.map((inv) => inv.property_id) || [])

      const period = billingPeriods.find((p) => p.id === selectedPeriod)!
      let created = 0
      let skipped = 0

      for (const property of properties) {
        if (existingPropertyIds.has(property.id)) {
          skipped++
          continue
        }

        // Calculate amount: override > property override > type default
        const baseAmount = overrideAmount
          ? parseFloat(overrideAmount)
          : (property.monthly_dues_override ?? (property.property_types as any)?.default_monthly_dues ?? 0)

        // Generate invoice number
        const invoiceNumber = `DUE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

        const { data: invoice, error: invErr } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            property_id: property.id,
            billing_period_id: selectedPeriod,
            issue_date: period.start_date,
            due_date: period.due_date,
            subtotal: baseAmount,
            total_amount: baseAmount,
            balance: baseAmount,
            status: 'pending',
          })
          .select('id')
          .single()

        if (!invErr && invoice && dueFeeType) {
          // Create invoice item
          await supabase.from('invoice_items').insert({
            invoice_id: invoice.id,
            fee_type_id: dueFeeType.id,
            description: `Monthly Dues — ${period.name}`,
            quantity: 1,
            unit_price: baseAmount,
            amount: baseAmount,
          })
        }

        if (!invErr) created++
        else skipped++
      }

      setResult({ created, skipped })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="border border-muted/60 p-8 bg-card rounded-xl shadow-sm">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Invoice Generation
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Auto-create invoices for all occupied units. System skips units with existing billing for the selected period.
          </p>
        </div>

        <div className="space-y-8">
          {/* Billing Period */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Billing Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select period..." />
              </SelectTrigger>
              <SelectContent>
                {billingPeriods.map((period) => (
                  <SelectItem key={period.id} value={period.id} className="font-medium">
                    {period.name} (DUE: {period.due_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Property Types */}
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Property Types</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {propertyTypes.map((type) => (
                <div key={type.id} className="flex items-center gap-4 p-4 border border-muted/60 rounded-lg bg-background hover:bg-muted/30 transition-colors">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => toggleType(type.id)}
                    className="size-5"
                  />
                  <Label htmlFor={`type-${type.id}`} className="flex-1 cursor-pointer">
                    <span className="font-bold tracking-tight block">{type.name}</span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                      Rate: ₱{Number(type.default_monthly_dues).toLocaleString()}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Override Amount */}
          <div className="space-y-3">
            <Label htmlFor="override" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rate Override (Optional)</Label>
            <Input
              id="override"
              type="number"
              placeholder="0.00"
              className="h-12"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(e.target.value)}
            />
            <p className="text-[10px] font-medium text-muted-foreground uppercase">
              Overrides all property-specific and type-based defaults if set.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm font-medium bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-sm font-medium border border-green-200 p-4 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Success: <strong>{result.created}</strong> Created / {result.skipped} Skipped
              </span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full h-14 font-bold text-lg shadow-md"
          >
            {isPending ? (
              <><Loader2 className="mr-2 size-5 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="mr-2 size-5 fill-current" /> Execute Generation</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
