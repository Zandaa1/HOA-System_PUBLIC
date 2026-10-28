'use client'

import { getErrorMessage } from '@/lib/utils'

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Property, BillingPeriod, FeeType, Invoice } from '@/lib/types/database'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { PropertySelectGroup } from '@/components/property-selector'


interface InvoiceFormProps {
  invoice?: Invoice
  properties: Property[]
  periods: BillingPeriod[]
  feeTypes: FeeType[]
  nextInvoiceNumber: string
}

export function InvoiceForm({
  invoice,
  properties,
  periods,
  feeTypes,
  nextInvoiceNumber,
}: InvoiceFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    invoice_number: invoice?.invoice_number || nextInvoiceNumber,
    property_id: invoice?.property_id || '',
    billing_period_id: invoice?.billing_period_id || '',
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    notes: invoice?.notes || '',
  })

  const [items, setItems] = useState<{ fee_type_id: string; description: string; quantity: number; unit_price: number }[]>(
    invoice?.invoice_items?.map(item => ({
      fee_type_id: item.fee_type_id || '',
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })) || [{ fee_type_id: '', description: '', quantity: 1, unit_price: 0 }]
  )

  const handleAddItem = () => {
    setItems([...items, { fee_type_id: '', description: '', quantity: 1, unit_price: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // If fee_type_id changes, auto-fill description and unit_price
    if (field === 'fee_type_id') {
      const fee = feeTypes.find(f => f.id === value)
      if (fee) {
        newItems[index].description = fee.name
        newItems[index].unit_price = fee.default_amount
      }
    }

    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const invoiceData = {
        invoice_number: formData.invoice_number,
        property_id: formData.property_id,
        billing_period_id: formData.billing_period_id || null,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        subtotal: subtotal,
        total_amount: subtotal,
        balance: subtotal,
        status: 'pending',
        notes: formData.notes || null,
      }

      let invId = invoice?.id

      if (invoice) {
        const { error: invError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id)
        if (invError) throw invError

        // Delete existing items for simplicity in update
        const { error: delError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id)
        if (delError) throw delError
      } else {
        const { data: newInv, error: invError } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()
        if (invError) throw invError
        invId = newInv.id
      }

      // Insert items
      const { error: itemsError } = await supabase.from('invoice_items').insert(
        items.map(item => ({
          invoice_id: invId,
          fee_type_id: item.fee_type_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
        }))
      )
      if (itemsError) throw itemsError

      router.push('/dashboard/billing/invoices')
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Invoice Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number *</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  required
                />
              </div>
              <PropertySelectGroup
                properties={properties}
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                required
              />
              <div className="space-y-2">
                <Label htmlFor="billing_period_id">Billing Period</Label>
                <Select
                  value={formData.billing_period_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, billing_period_id: value })
                    const period = periods.find(p => p.id === value)
                    if (period) {
                      setFormData(prev => ({ ...prev, due_date: period.due_date }))
                    }
                  }}
                >
                  <SelectTrigger id="billing_period_id">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 size-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-12 items-end border-b pb-4 last:border-0 last:pb-0">
                  <div className="sm:col-span-4 space-y-2">
                    <Label htmlFor={`line_item_fee_type_${index}`} className="text-xs">
                      Fee Type {index + 1}
                    </Label>
                    <Select
                      value={item.fee_type_id}
                      onValueChange={(val) => handleItemChange(index, 'fee_type_id', val)}
                    >
                      <SelectTrigger id={`line_item_fee_type_${index}`}>
                        <SelectValue placeholder="Select fee" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeTypes.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3 space-y-2">
                    <Label htmlFor={`line_item_description_${index}`} className="text-xs">
                      Description {index + 1}
                    </Label>
                    <Input
                      id={`line_item_description_${index}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-2">
                    <Label htmlFor={`line_item_quantity_${index}`} className="text-xs">
                      Qty {index + 1}
                    </Label>
                    <Input
                      id={`line_item_quantity_${index}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor={`line_item_price_${index}`} className="text-xs">
                      Price {index + 1}
                    </Label>
                    <Input
                      id={`line_item_price_${index}`}
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-1 text-right font-medium py-2">
                    ₱{(item.quantity * item.unit_price).toLocaleString()}
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      aria-label={`Remove line item ${index + 1}`}
                      title={`Remove line item ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total Amount</span>
                <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="space-y-2 pt-4">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Internal notes or message to homeowner"
                />
              </div>
            </CardContent>
          </Card>

          <FormGuide 
            notes={[
              "Invoice numbers are auto-generated but can be manually overridden if needed.",
              "Selecting a Billing Period will automatically set the appropriate due date.",
              "Fee types automatically populate the description and unit price.",
              "Ensure all line items are reviewed before saving, as this affects the property balance."
            ]}
          />

          <div className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </form>
  )
}
