
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBranding, DEFAULT_BRANDING } from '@/lib/branding'
import { SetupWizard } from './setup-wizard'

export default async function SetupPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: staff } = await supabase.from('staff').select('*').eq('user_id', user.id).maybeSingle()
  if (!staff) redirect('/portal')

  const [settingsResponse, propertyTypesResponse, waterRatesResponse] = await Promise.all([
    supabase.from('system_settings').select('setting_key, setting_value'),
    supabase.from('property_types').select('*').order('name'),
    supabase.from('water_rates').select('*').eq('is_active', true).order('min_consumption'),
  ])

  const settings = settingsResponse.data || []
  const propertyTypes = propertyTypesResponse.data || []
  const waterRates = waterRatesResponse.data || []
  const branding = getBranding(settings)

  // Developer account skips setup — redirect to dashboard
  const developerStaffId = settings.find((s) => s.setting_key === 'developer_staff_id')?.setting_value
  if (staff.id === developerStaffId) {
    redirect('/dashboard')
  }

  // Check if setup was already completed
  const setupDone = settings.find((s) => s.setting_key === 'setup_completed')?.setting_value === 'true'

  // Check if branding is still at defaults (quick check)
  const isDefault = branding.hoaName === DEFAULT_BRANDING.hoaName

  return (
    <SetupWizard
      initialBranding={branding}
      initialSettings={settings}
      initialPropertyTypes={propertyTypes}
      initialWaterRates={waterRates}
      setupDone={setupDone}
      isDefault={isDefault}
    />
  )
}

