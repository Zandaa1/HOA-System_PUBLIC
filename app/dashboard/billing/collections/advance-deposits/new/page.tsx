
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { AdvanceDepositForm } from './advance-deposit-form'

export default async function NewAdvanceDepositPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="New Advance Deposit"
        description="Record a prepayment or deposit from a homeowner"
      />
      <AdvanceDepositForm properties={properties || []} />
    </div>
  )
}
