
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsForm } from './settings-form'

export default async function PortalSettingsPage() {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  // Fetch current privacy settings
  const selectQuery = residentSession.resident_type === 'homeowner'
    ? 'hide_email, hide_phone, property_id, property:properties(is_rented)'
    : 'hide_email, hide_phone'

  const { data: profile } = (await supabase
    .from(residentSession.resident_type === 'homeowner' ? 'homeowners' : 'renters')
    .select(selectQuery)
    .eq('id', residentSession.resident_id)
    .single()) as any

  const homeownerProfile = profile as any
  const initialIsRented = homeownerProfile?.property?.is_rented ?? false
  const propertyId = homeownerProfile?.property_id ?? ''

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-8">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and privacy."
      />

      <div className="max-w-2xl">
        <Card className="border-muted/60 shadow-sm">
          <CardHeader>
            <CardTitle>Privacy Preferences</CardTitle>
            <CardDescription>
              Control what information is visible to other residents in the Community Directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm 
              initialData={{
                hide_email: profile?.hide_email ?? false,
                hide_phone: profile?.hide_phone ?? false,
                is_rented: initialIsRented
              }}
              residentId={residentSession.resident_id}
              residentType={residentSession.resident_type}
              propertyId={propertyId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
