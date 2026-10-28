
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { RentersTable } from './renters-table'

export default async function RentersPage() {
  const supabase = await createClient()

  const { data: renters } = await supabase
    .from('renters')
    .select(`
      *,
      property:properties(id, block, lot, status)
    `)
    .order('last_name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renters"
        description="Manage tenants and leaseholders"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/residents/renters/new">
              <Plus className="mr-2 size-4" />
              Add Renter
            </Link>
          </Button>
        }
      />

      <RentersTable renters={renters || []} />
    </div>
  )
}
