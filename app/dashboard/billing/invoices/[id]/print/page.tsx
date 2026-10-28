
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrintableInvoice } from './printable-invoice'

// Server Component — fetches data and passes serializable props to the client PrintableInvoice
export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      property:properties(id, block, lot, street_address, homeowners(first_name, last_name)),
      billing_period:billing_periods(name),
      invoice_items(*)
    `)
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  const property = invoice.property as {
    id: string
    block: string
    lot: string
    street_address: string | null
    homeowners: { first_name: string; last_name: string }[]
  } | null

  return (
    <PrintableInvoice
      invoice={{
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: Number(invoice.subtotal),
        discount_amount: Number(invoice.discount_amount ?? 0),
        penalty_amount: Number(invoice.penalty_amount ?? 0),
        total_amount: Number(invoice.total_amount),
        amount_paid: Number(invoice.amount_paid ?? 0),
        balance: Number(invoice.balance),
        billing_period: invoice.billing_period as { name: string } | null,
        invoice_items: (invoice.invoice_items as any[]) || [],
      }}
      property={property}
    />
  )
}
