
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { PermitsClient } from '@/components/dashboard/permits-client'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function PermitsAdminPage() {
  const supabase = await createClient()

  // Fetch permits
  const { data: permits } = await supabase
    .from('construction_permits')
    .select(`
      *,
      property:properties(id, block, lot)
    `)
    .order('created_at', { ascending: false })

  // Fetch bank accounts (for refunds)
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Construction & Renovation Permits"
        description="Review subdivision construction applications, track bonds, and process refunds."
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/permits/new">
              <Plus className="mr-2 size-4" />
              New Application
            </Link>
          </Button>
        }
      />

      <PermitsClient permits={permits || []} bankAccounts={bankAccounts || []} />
    </div>
  )
}
