
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './settings-form'
import { PageHeader } from '@/components/ui/page-header'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key')

  // Resolve if the current user is a Developer
  const { data: { user } } = await supabase.auth.getUser()
  const { data: staffMember } = await supabase.from('staff').select('id').eq('user_id', user?.id).maybeSingle()
  const devSetting = settings?.find((s) => s.setting_key === 'developer_staff_id')?.setting_value
  const isDeveloper = staffMember?.id === devSetting

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="System Settings"
        description="Configure association-wide parameters and system behavior"
      />

      <SettingsForm settings={settings || []} isDeveloper={isDeveloper} />
    </div>
  )
}
