
import Link from 'next/link'
import { PageHeader } from "@/components/ui/page-header"
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { PaymentsTable } from './payments-table'

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      invoice_id,
      payment_number,
      amount,
      payment_date,
      payment_method,
      reference_number,
      invoice:invoices(
        invoice_number,
        property:properties(block, lot)
      )
    `)
    .order('payment_date', { ascending: false })

  const formattedPayments = (payments || []).map((p: any) => {
    const rawInvoice = Array.isArray(p.invoice) ? p.invoice[0] : p.invoice
    return {
      ...p,
      invoice: rawInvoice ? {
        invoice_number: rawInvoice.invoice_number,
        property: Array.isArray(rawInvoice.property) ? rawInvoice.property[0] : rawInvoice.property
      } : null
    }
  })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Payments"
        description="View and manage all received payments"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/billing/payments/new">
              <Plus className="mr-2 size-4" />
              Record Payment
            </Link>
          </Button>
        }
      />

      <PaymentsTable payments={formattedPayments as any} />
    </div>
  )
}
