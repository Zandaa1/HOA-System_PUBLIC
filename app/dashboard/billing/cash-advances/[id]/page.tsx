
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AdvanceDetails } from './advance-details'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CashAdvanceDetailPage(props: PageProps) {
  const params = await props.params
  const supabase = await createClient()

  // Fetch Cash Advance Details
  const { data: advance } = await supabase
    .from('cash_advances')
    .select(`
      *,
      source_bank_account:bank_accounts(id, name)
    `)
    .eq('id', params.id)
    .single()

  if (!advance) {
    notFound()
  }

  // Fetch liquidations
  const { data: liquidations } = await supabase
    .from('advance_liquidations')
    .select('*')
    .eq('cash_advance_id', params.id)
    .order('receipt_date', { ascending: false })

  // Fetch returns
  const { data: returns } = await supabase
    .from('advance_returns')
    .select('*')
    .eq('cash_advance_id', params.id)
    .order('returned_at', { ascending: false })

  // Fetch active bank accounts for fund releasing
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Fetch settings for configurable values (liquidation deadline, etc.)
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')

  return (
    <div className=" pb-8">
      <AdvanceDetails
        advance={advance as any}
        liquidations={(liquidations as any) || []}
        returns={(returns as any) || []}
        bankAccounts={(bankAccounts as any) || []}
        settings={(settings as any) || []}
      />
    </div>
  )
}
