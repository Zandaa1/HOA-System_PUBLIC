
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { PrintableInvoice } from '@/app/dashboard/billing/invoices/[id]/print/printable-invoice'

export default async function PortalPrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  // Verify session
  const residentSession = await getResidentSession(supabase)
  if (!residentSession) {
    redirect('/auth/login')
  }

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
    <div className="bg-white text-black min-h-screen -m-6 md:-m-8 print:m-0">
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
        autoPrint={true}
      />
    </div>
  )
}
