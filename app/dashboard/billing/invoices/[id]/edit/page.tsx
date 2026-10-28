
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceForm } from '@/components/forms/invoice-form'

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: invoice },
    { data: properties },
    { data: periods },
    { data: feeTypes }
  ] = await Promise.all([
    supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
    supabase.from('billing_periods').select('id, name, due_date').eq('is_closed', false).order('created_at', { ascending: false }),
    supabase.from('fee_types').select('id, name, default_amount').eq('is_active', true).order('name')
  ])

  if (!invoice) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Update invoice {invoice.invoice_number}
        </p>
      </div>

      <InvoiceForm 
        invoice={invoice}
        properties={(properties || []) as any}
        periods={(periods || []) as any}
        feeTypes={(feeTypes || []) as any}
        nextInvoiceNumber={invoice.invoice_number}
      />
    </div>
  )
}
