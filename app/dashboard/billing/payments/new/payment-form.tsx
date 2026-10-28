'use client'

import { getErrorMessage } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'

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
import { Loader2 } from 'lucide-react'
import { BankAccount, Payment } from '@/lib/types/database'

interface Invoice {
  id: string
  invoice_number: string
  balance: number
  amount_paid: number
  property: { block: string; lot: string } | { block: string; lot: string }[] | null
}

interface PaymentFormProps {
  invoices: Invoice[]
  bankAccounts: BankAccount[]
  defaultInvoiceId?: string
  nextPaymentNumber: string
  payment?: (Payment & { attachment_url?: string | null }) | null
}

export function PaymentForm({
  invoices,
  bankAccounts,
  defaultInvoiceId,
  nextPaymentNumber,
  payment,
}: PaymentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    payment_number: payment?.payment_number || nextPaymentNumber,
    invoice_id: payment?.invoice_id || defaultInvoiceId || '',
    amount: payment?.amount ? String(payment.amount) : '',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    payment_method: payment?.payment_method || '',
    bank_account_id: payment?.bank_account_id || '',
    reference_number: payment?.reference_number || '',
    notes: payment?.notes || '',
  })

  const selectedInvoice = invoices.find((i) => i.id === formData.invoice_id)
  const [file, setFile] = useState<File | null>(null)
  const existingAttachment = payment?.attachment_url || null

  const getStatus = (balance: number): 'pending' | 'paid' => {
    if (balance <= 0) return 'paid'
    return 'pending'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const amount = parseFloat(formData.amount)

    let uploadedPath: string | null = null

    try {
      if (!formData.invoice_id) {
        throw new Error('Please select an invoice.')
      }
      if (!formData.bank_account_id) {
        throw new Error('Please select a deposit bank account.')
      }

      let attachment_url = existingAttachment

      // Upload file if selected
      if (file) {
        const uploaded = await uploadAppFile(file, { directory: 'payments' })
        uploadedPath = uploaded.path
        attachment_url = uploaded.path
      }

      if (payment) {
        const originalAmount = Number(payment.amount)
        const originalInvoice = payment.invoice

        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            payment_number: formData.payment_number,
            invoice_id: formData.invoice_id,
            amount,
            payment_date: formData.payment_date,
            payment_method: formData.payment_method || null,
            bank_account_id: formData.bank_account_id,
            reference_number: formData.reference_number || null,
            notes: formData.notes || null,
            attachment_url,
          })
          .eq('id', payment.id)

        if (paymentError) throw paymentError

        if (originalInvoice) {
          if (originalInvoice.id === formData.invoice_id && selectedInvoice) {
            const newBalance = Number(originalInvoice.balance) + originalAmount - amount
            const newAmountPaid = Number(originalInvoice.amount_paid) - originalAmount + amount

            const { error: updateError } = await supabase
              .from('invoices')
              .update({
                amount_paid: Math.max(0, newAmountPaid),
                balance: Math.max(0, newBalance),
                status: getStatus(Math.max(0, newBalance)),
              })
              .eq('id', originalInvoice.id)

            if (updateError) throw updateError
          } else {
            // Restore the original amount
            const restoredBalance = Number(originalInvoice.balance) + originalAmount
            const restoredAmountPaid = Number(originalInvoice.amount_paid) - originalAmount
            const { error: restoreError } = await supabase
              .from('invoices')
              .update({
                amount_paid: Math.max(0, restoredAmountPaid),
                balance: Math.max(0, restoredBalance),
                status: getStatus(Math.max(0, restoredBalance)),
              })
              .eq('id', originalInvoice.id)

            if (restoreError) throw restoreError

            if (selectedInvoice) {
              const newBalance = Number(selectedInvoice.balance) - amount
              const newAmountPaid = Number(selectedInvoice.amount_paid) + amount

              const { error: applyError } = await supabase
                .from('invoices')
                .update({
                  amount_paid: Math.max(0, newAmountPaid),
                  balance: Math.max(0, newBalance),
              status: getStatus(Math.max(0, newBalance)),
                })
                .eq('id', selectedInvoice.id)

              if (applyError) throw applyError
            }
          }
        }
      } else {
        const { data: invoiceForUpdate, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, balance, amount_paid')
          .eq('id', formData.invoice_id)
          .single()

        if (invoiceError) throw invoiceError
        if (!invoiceForUpdate) throw new Error('Selected invoice was not found.')

        // Create payment
        const { error: paymentError } = await supabase.from('payments').insert({
          payment_number: formData.payment_number,
          invoice_id: formData.invoice_id,
          amount,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method || null,
          bank_account_id: formData.bank_account_id,
          reference_number: formData.reference_number || null,
          notes: formData.notes || null,
          attachment_url,
        })

        if (paymentError) throw paymentError

        // Update invoice
        if (invoiceForUpdate) {
          const newBalance = Number(invoiceForUpdate.balance) - amount
          const newAmountPaid = Number(invoiceForUpdate.amount_paid) + amount

          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              amount_paid: Math.max(0, newAmountPaid),
              balance: Math.max(0, newBalance),
              status: getStatus(Math.max(0, newBalance)),
            })
            .eq('id', invoiceForUpdate.id)

          if (updateError) throw updateError
        }
      }
      if (uploadedPath && existingAttachment) {
        await deleteAppFile(existingAttachment)
      }
      router.push('/dashboard/billing/payments')
      router.refresh()
    } catch (err) {
      await deleteAppFile(uploadedPath).catch(() => {})
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment_number">Payment Number</Label>
            <Input
              id="payment_number"
              value={formData.payment_number}
              onChange={(e) =>
                setFormData({ ...formData, payment_number: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_id">Invoice *</Label>
            <Select
              value={formData.invoice_id}
              onValueChange={(value) =>
                setFormData({ ...formData, invoice_id: value })
              }
            >
              <SelectTrigger id="invoice_id">
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - Block {Array.isArray(invoice.property) ? invoice.property[0]?.block : invoice.property?.block}, Lot{' '}
                    {Array.isArray(invoice.property) ? invoice.property[0]?.lot : invoice.property?.lot} (₱
                    {Number(invoice.balance).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    due)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₱) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
              placeholder={
                selectedInvoice
                  ? `Balance: ₱${Number(selectedInvoice.balance).toLocaleString(
                      'en-PH',
                      { minimumFractionDigits: 2 }
                    )}`
                  : ''
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) =>
                setFormData({ ...formData, payment_date: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="gcash">GCash</SelectItem>
                <SelectItem value="maya">Maya</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_id">Deposit Account *</Label>
            <Select
              value={formData.bank_account_id}
              onValueChange={(value) =>
                setFormData({ ...formData, bank_account_id: value })
              }
            >
              <SelectTrigger id="bank_account_id">
                <SelectValue placeholder="Select deposit account" />
              </SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) =>
                setFormData({ ...formData, reference_number: e.target.value })
              }
              placeholder="Check #, transaction ID, etc."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="attachment">Proof of Payment (Image)</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-[10px] text-muted-foreground">
              Upload a screenshot of the GCash/Maya/Bank receipt.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {payment ? 'Update Payment' : 'Record Payment'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
