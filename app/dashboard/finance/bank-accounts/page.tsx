
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { BankAccountsManager } from './bank-accounts-manager'
import { Plus } from 'lucide-react'
import { requireModule } from '@/lib/check-module'

export default async function BankAccountsPage() {
  await requireModule('enable_bank_accounts')
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Bank Accounts"
        description="Manage bank accounts for cash flow attribution"
      />
      <BankAccountsManager initialAccounts={(accounts as any) || []} />
    </div>
  )
}
