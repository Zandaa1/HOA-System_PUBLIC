
import { createClient } from '@/lib/supabase/server'
import { PaymentForm } from './payment-form'

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string }>
}) {
  const { invoice_id } = await searchParams
  const supabase = await createClient()

  const [{ data: invoices }, { data: bankAccounts }, { data: settings }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        balance,
        amount_paid,
        property:properties(block, lot)
      `)
      .in('status', ['pending', 'overdue'])
      .order('created_at', { ascending: false }),
    supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_prefix')
      .single(),
  ])

  const paymentPrefix = settings?.setting_value || 'PAY'

  // Generate next payment number
  const { data: lastPayment } = await supabase
    .from('payments')
    .select('payment_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastPayment?.payment_number) {
    const match = lastPayment.payment_number.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  const nextPaymentNumber = `${paymentPrefix}-${String(nextNumber).padStart(6, '0')}`

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record Payment</h1>
        <p className="text-sm text-muted-foreground">
          Record a new payment transaction
        </p>
      </div>

      <PaymentForm
        invoices={invoices || []}
        bankAccounts={bankAccounts || []}
        defaultInvoiceId={invoice_id}
        nextPaymentNumber={nextPaymentNumber}
      />
    </div>
  )
}
