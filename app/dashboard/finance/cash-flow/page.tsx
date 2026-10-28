
import { createClient } from '@/lib/supabase/server'
import { CashFlowReport } from '../../reports/cash-flow/cash-flow-report'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { requireModule } from '@/lib/check-module'

export default async function FinanceCashFlowPage() {
  await requireModule('enable_finance')
  const supabase = await createClient()

  const [paymentsRes, nicRes, disbursementsRes, transfersRes, accountsRes, balancesRes] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        bank_account_id,
        invoice:invoices (
          id,
          invoice_number,
          invoice_items (
            id,
            amount,
            fee_type:fee_types (id, name)
          )
        )
      `)
      .order('payment_date', { ascending: true }),
    supabase
      .from('non_invoice_collections')
      .select('id, amount, payment_date, category, bank_account_id, payment_method')
      .order('payment_date', { ascending: true }),
    supabase
      .from('disbursements')
      .select('id, amount, payment_date, category, bank_account_id, payment_method, is_advance_release, is_fund_transfer, bank_account:bank_accounts(name)')
      .eq('is_advance_release', false)
      .eq('is_fund_transfer', false)
      .order('payment_date', { ascending: true }),
    supabase
      .from('account_transfers')
      .select('id, amount, transfer_date, source_bank_account_id, destination_bank_account_id, reference_number')
      .order('transfer_date', { ascending: true }),
    supabase
      .from('bank_accounts')
      .select('*')
      .order('name'),
    supabase
      .from('bank_balances')
      .select('*')
      .order('period_year')
      .order('period_month'),
  ])

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/finance">
              <ArrowLeft className="mr-2 size-4" />
              Finance
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Statement of Cash Flows</h1>
            <p className="text-sm text-muted-foreground">Monthly, Quarterly, and YTD rollforward report</p>
          </div>
        </div>
      </div>

      <CashFlowReport
        payments={(paymentsRes.data as any) || []}
        nonInvoiceCollections={(nicRes.data as any) || []}
        disbursements={(disbursementsRes.data as any) || []}
        accountTransfers={(transfersRes.data as any) || []}
        bankAccounts={(accountsRes.data as any) || []}
        bankBalances={(balancesRes.data as any) || []}
      />
    </div>
  )
}
