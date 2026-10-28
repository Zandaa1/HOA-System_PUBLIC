
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { DeveloperClient } from './developer-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'


export default async function DeveloperPortalPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Load staff profile
  const { data: staffMember } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staffMember) redirect('/portal')

  // 3. Resolve developer staff ID from system settings
  const { data: devSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'developer_staff_id')
    .maybeSingle()

  const developerStaffId = devSetting?.setting_value

  // Strictly gate the Developer Portal to the system developer account only
  if (!developerStaffId || staffMember.id !== developerStaffId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center space-x-2 text-destructive">
              <ShieldAlert className="size-5" />
              <CardTitle className="text-xl">Access Denied</CardTitle>
            </div>
            <CardDescription>
              Developer Portal access is restricted to the system developer account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please contact the system owner if you need access to these simulation and configuration tools.
          </CardContent>
        </Card>
      </div>
    )
  }

  // 4. Load live metrics, staff, homeowners, settings, and logs
  const [
    staffRes,
    homeownersRes,
    settingsRes,
    logsRes,
    staffCountRes,
    homeownersCountRes,
    vehiclesCountRes,
    settingsCountRes,
    logsCountRes,
  ] = await Promise.all([
    supabase.from('staff').select('*').order('first_name'),
    supabase.from('homeowners').select('*').order('first_name'),
    supabase.from('system_settings').select('*').order('setting_key'),
    supabase
      .from('audit_logs')
      .select('*, staff:staff!staff_id(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('staff').select('id', { count: 'exact', head: true }),
    supabase.from('homeowners').select('id', { count: 'exact', head: true }),
    supabase.from('vehicles').select('id', { count: 'exact', head: true }),
    supabase.from('system_settings').select('id', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
  ])

  // Fetch boundary from DB
  const { data: boundaryRow } = await supabase
    .from('map_boundaries')
    .select('geometry')
    .eq('name', 'default')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const boundary = boundaryRow?.geometry || null

  const kpis = {
    staffCount: staffCountRes.count || 0,
    homeownersCount: homeownersCountRes.count || 0,
    vehiclesCount: vehiclesCountRes.count || 0,
    settingsCount: settingsCountRes.count || 0,
    logsCount: logsCountRes.count || 0,
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Developer Tools"
        description="Debug tools, system diagnostics, email testing, and configuration management."
      />

      <DeveloperClient
        initialStaff={staffRes.data || []}
        initialHomeowners={homeownersRes.data || []}
        initialLogs={logsRes.data || []}
        initialSettings={settingsRes.data || []}
        kpis={kpis}
        initialBoundary={boundary}
      />
    </div>
  )
}
