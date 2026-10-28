
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { HomeownersTable } from './homeowners-table'

export default async function HomeownersPage() {
  const supabase = await createClient()

  const { data: homeowners } = await supabase
    .from('homeowners')
    .select(`
      *,
      property:properties(id, block, lot, status)
    `)
    .order('last_name')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homeowners"
        description="Manage property owners"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/residents/homeowners/new">
              <Plus className="mr-2 size-4" />
              Add Homeowner
            </Link>
          </Button>
        }
      />

      <HomeownersTable homeowners={homeowners || []} />
    </div>
  )
}
