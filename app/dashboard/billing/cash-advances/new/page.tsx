
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { AdvanceForm } from './advance-form'

export default async function NewCashAdvancePage() {
  const supabase = await createClient()

  // Get active bank accounts
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Request Cash Advance"
        description="Fill out the details below to request a staff or Petty Cash Fund cash advance."
      />

      <AdvanceForm bankAccounts={(bankAccounts as any) || []} />
    </div>
  )
}
