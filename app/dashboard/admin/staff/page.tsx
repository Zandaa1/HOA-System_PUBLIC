
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { StaffTable } from './staff-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function StaffPage() {
  const supabase = await createClient()

  // Exclude hidden developer accounts from staff list
  const { data: devSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'developer_staff_id')
    .maybeSingle()

  const devId = devSetting?.setting_value

  let query = supabase.from('staff').select('*')
  if (devId) {
    query = query.neq('id', devId)
  }
  const { data: staff } = await query
    .order('last_name')
    .order('first_name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Staff & Access"
        description="Manage staff accounts and the page groups each person can open"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/admin/staff/new">
              <Plus className="mr-2 size-4" />
              Add Staff
            </Link>
          </Button>
        }
      />

      <StaffTable staff={staff || []} />
    </div>
  )
}
