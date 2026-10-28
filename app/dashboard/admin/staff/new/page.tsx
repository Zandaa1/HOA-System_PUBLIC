import { createClient } from '@/lib/supabase/server'
import { StaffForm } from '@/components/forms/staff-form'

export default async function NewStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffMember } = await supabase.from('staff').select('id').eq('user_id', user?.id).maybeSingle()
  const { data: devSetting } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'developer_staff_id').maybeSingle()
  const isDeveloper = staffMember?.id === devSetting?.setting_value

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Staff Member</h1>
        <p className="text-sm text-muted-foreground">
          Register a staff login and choose page-group access
        </p>
      </div>

      <StaffForm isDeveloper={isDeveloper} />
    </div>
  )
}
