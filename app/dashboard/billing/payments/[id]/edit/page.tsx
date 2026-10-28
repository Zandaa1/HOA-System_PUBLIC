
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PaymentForm } from '@/app/dashboard/billing/payments/new/payment-form'
import { Payment } from '@/lib/types/database'

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: payment }, { data: invoices }, { data: bankAccounts }, { data: settings }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          id,
          invoice_number,
          balance,
          amount_paid,
          property:properties(block, lot)
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        balance,
        amount_paid,
        property:properties(block, lot)
      `)
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

  if (!payment) notFound()

  const paymentPrefix = settings?.setting_value || 'PAY'
  const nextPaymentNumber = payment.payment_number || `${paymentPrefix}-000001`

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Payment</h1>
        <p className="text-sm text-muted-foreground">
          Update payment {payment.payment_number}
        </p>
      </div>

      <PaymentForm
        invoices={invoices || []}
        bankAccounts={bankAccounts || []}
        nextPaymentNumber={nextPaymentNumber}
        payment={payment as Payment & { attachment_url?: string | null }}
      />
    </div>
  )
}
