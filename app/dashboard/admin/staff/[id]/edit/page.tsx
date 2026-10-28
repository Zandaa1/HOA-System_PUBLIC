
import { createClient } from '@/lib/supabase/server'
import { StaffForm } from '@/components/forms/staff-form'
import { notFound } from 'next/navigation'

interface EditStaffPageProps {
  params: Promise<{ id: string }>
}

export default async function EditStaffPage({ params }: EditStaffPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', id)
    .single()

  if (!staff) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffMember } = await supabase.from('staff').select('id').eq('user_id', user?.id).maybeSingle()
  const { data: devSetting } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'developer_staff_id').maybeSingle()
  const isDeveloper = staffMember?.id === devSetting?.setting_value

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Staff Member</h1>
        <p className="text-sm text-muted-foreground">
          Update profile and access for {staff.first_name} {staff.last_name}
        </p>
      </div>

      <StaffForm staff={staff} isDeveloper={isDeveloper} />
    </div>
  )
}
