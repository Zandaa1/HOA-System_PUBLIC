
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus, PiggyBank } from 'lucide-react'
import Link from 'next/link'
import { CashAdvancesList } from './cash-advances-list'
import { requireModule } from '@/lib/check-module'

export default async function CashAdvancesPage() {
  await requireModule('enable_cash_advances')
  const supabase = await createClient()

  // Query cash advances
  const { data: advances } = await supabase
    .from('cash_advances')
    .select(`
      *,
      source_bank_account:bank_accounts(id, name)
    `)
    .order('created_at', { ascending: false })

  // Query aging data
  const { data: aging } = await supabase
    .from('cash_advance_aging')
    .select('*')
    .order('days_overdue', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Cash Advances"
        description="Track staff advances and Petty Cash Fund (PCF) releases, monitor liquidations, and manage returns."
        action={
          <div className="flex gap-3">
            <Button asChild size="sm" variant="outline" className="h-9 px-4">
              <Link href="/dashboard/finance">
                <PiggyBank className="mr-2 size-4" />
                PCF Dashboard
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/billing/cash-advances/new">
                <Plus className="mr-2 size-4" />
                Request Advance
              </Link>
            </Button>
          </div>
        }
      />

      <CashAdvancesList
        advances={(advances as any) || []}
        aging={(aging as any) || []}
      />
    </div>
  )
}
