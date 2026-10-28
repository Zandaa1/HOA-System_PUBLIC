
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AdvanceDepositsTable } from './advance-deposits-table'

export default async function AdvanceDepositsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('advance_deposits')
    .select('*, property:properties(block, lot)')
    .order('deposit_date', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Advance Deposits"
        description="Prepayments and deposits from homeowners"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/billing/collections/advance-deposits/new">
              <Plus className="mr-2 size-4" />
              Add Deposit
            </Link>
          </Button>
        }
      />

      <AdvanceDepositsTable data={data || []} />
    </div>
  )
}
