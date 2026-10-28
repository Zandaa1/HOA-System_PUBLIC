
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { PCFManager } from './pcf-manager'
import { requireModule } from '@/lib/check-module'

export default async function PCFPage() {
  await requireModule('enable_cash_advances')
  const supabase = await createClient()

  // 1. Fetch PCF bank accounts
  const { data: pcfAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('type', 'petty_cash')
    .eq('is_active', true)

  const pcfAccount = pcfAccounts && pcfAccounts.length > 0 ? pcfAccounts[0] : null

  // 2. Fetch latest balance for the PCF account from bank_balances
  let pcfBalance = 0
  if (pcfAccount) {
    const { data: balances } = await supabase
      .from('bank_balances')
      .select('ending_balance')
      .eq('bank_account_id', pcfAccount.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(1)

    pcfBalance = balances && balances.length > 0 ? Number(balances[0].ending_balance) : 0
  }

  // 3. Fetch active custodian advances (released / partially liquidated and type = 'pcf')
  const { data: custodianAdvances } = await supabase
    .from('cash_advances')
    .select('*')
    .eq('advance_type', 'pcf')
    .in('status', ['released', 'partially_liquidated'])
    .order('created_at', { ascending: false })

  // 4. Fetch PCF Replenishments log
  const { data: replenishments } = await supabase
    .from('pcf_replenishments')
    .select(`
      *,
      source_bank_account:bank_accounts(id, name)
    `)
    .order('created_at', { ascending: false })

  // 5. Fetch other main accounts (savings/current) as source options for replenishment
  const { data: mainAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .neq('type', 'petty_cash')
    .order('name')

  // 6. Fetch system settings for PCF config
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Petty Cash Fund (PCF)"
        description="Monitor the Petty Cash Fund balances, custodian cash drawdowns, liquidations, and Replenishments."
      />

      <PCFManager
        pcfAccount={pcfAccount as any}
        pcfBalance={pcfBalance}
        custodianAdvances={(custodianAdvances as any) || []}
        replenishments={(replenishments as any) || []}
        mainAccounts={(mainAccounts as any) || []}
        settings={(settings as any) || []}
      />
    </div>
  )
}
