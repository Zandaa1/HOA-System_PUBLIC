
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { DisbursementsManager } from './disbursements-manager'
import { requireModule } from '@/lib/check-module'

export default async function DisbursementsPage() {
  await requireModule('enable_disbursements')
  const supabase = await createClient()

  const [disbursementsResponse, collectionsResponse, transfersResponse, accountsResponse] = await Promise.all([
    supabase
      .from('disbursements')
      .select('*, bank_account:bank_accounts(*)')
      .order('payment_date', { ascending: false }),
    supabase
      .from('non_invoice_collections')
      .select('*, bank_account:bank_accounts(*)')
      .order('payment_date', { ascending: false }),
    supabase
      .from('account_transfers')
      .select('*')
      .order('transfer_date', { ascending: false }),
    supabase
      .from('bank_accounts')
      .select('*')
      .order('name'),
  ])

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Disbursements, Miscellaneous Income & Transfers"
        description="Log operational expenses, non-invoice cash collections like bank interest, and movement between bank accounts."
      />

      <DisbursementsManager
        initialDisbursements={(disbursementsResponse.data as any) || []}
        initialNonInvoiceCollections={(collectionsResponse.data as any) || []}
        initialAccountTransfers={(transfersResponse.data as any) || []}
        bankAccounts={(accountsResponse.data as any) || []}
      />
    </div>
  )
}
