
import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '@/components/forms/invoice-form'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  
  const [
    { data: properties },
    { data: periods },
    { data: feeTypes },
    { data: settings },
    { data: lastInvoice }
  ] = await Promise.all([
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
    supabase.from('billing_periods').select('id, name, due_date').eq('is_closed', false).order('created_at', { ascending: false }),
    supabase.from('fee_types').select('id, name, default_amount').eq('is_active', true).order('name'),
    supabase.from('system_settings').select('setting_value').eq('setting_key', 'invoice_prefix').single(),
    supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1).single()
  ])

  const invoicePrefix = settings?.setting_value || 'INV'
  
  let nextNumber = 1
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  const nextInvoiceNumber = `${invoicePrefix}-${String(nextNumber).padStart(6, '0')}`

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Generate a new invoice for a property
        </p>
      </div>

      <InvoiceForm 
        properties={(properties || []) as any}
        periods={(periods || []) as any}
        feeTypes={(feeTypes || []) as any}
        nextInvoiceNumber={nextInvoiceNumber}
      />
    </div>
  )
}
