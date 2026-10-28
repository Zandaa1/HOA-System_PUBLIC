
import { createClient } from '@/lib/supabase/server'
import { getBranding } from '@/lib/branding'
import { getResidentSession } from '@/lib/supabase/resident'
import { redirect } from 'next/navigation'
import { MaintenanceRequestForm } from './maintenance-request-form'

export default async function NewMaintenanceRequestPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const branding = getBranding(settings || [])
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  return (
    <div className="max-w-3xl space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-12 p-6 mx-auto">
      <div className="border-b pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">File Maintenance Request</h1>
        <p className="text-muted-foreground mt-1">
          Request building repairs, landscaping, or plumbing support from {branding.hoaName} staff.
        </p>
      </div>
      <MaintenanceRequestForm propertyId={residentSession.property_id} />
    </div>
  )
}
