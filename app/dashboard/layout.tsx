import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { RouteMotion } from '@/components/route-motion'
import { headers } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { getBranding } from '@/lib/branding'
import { DashboardAlerts } from '@/components/dashboard-alerts'

import { resolveStaffPermissions, hasRouteAccess } from '@/lib/modules'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const headerList = await headers()
  const pathname = headerList.get('x-pathname') || '/dashboard'

  // Load staff profile and system settings
  const [staffResponse, settingsResponse] = await Promise.all([
    supabase.from('staff').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('system_settings').select('*'),
  ])

  const staffMember = staffResponse.data
  const settings = settingsResponse.data || []

  if (!staffMember) {
    redirect('/portal')
  }

  // Resolve effective permissions from staff checklist
  const effectivePerms = resolveStaffPermissions(staffMember.permissions)

  const testDataEnabled = settings.some((s) => s.setting_key === 'test_data_seeded')
  const hideTestData = settings.some((s) => s.setting_key === 'dev_hide_test_data_alert' && s.setting_value === 'true')
  const isAuthorized = hasRouteAccess(pathname, effectivePerms)
  const branding = getBranding(settings)

  const developerStaffId = settings.find((s) => s.setting_key === 'developer_staff_id')?.setting_value
  const isDeveloper = staffMember.id === developerStaffId

  const autoCollapse = pathname.startsWith('/dashboard/billing') || pathname.startsWith('/dashboard/finance')
  const isSetup = pathname === '/dashboard/setup'
  const isForceReset = pathname === '/dashboard/force-reset'
  const setupCompleted = settings.find((s) => s.setting_key === 'setup_completed')?.setting_value === 'true'

  // Force password reset only after setup is completed, test data is enabled, or user is developer
  const isSetupDone = setupCompleted || testDataEnabled || isDeveloper
  if (isSetupDone && user.user_metadata?.force_password_reset && pathname !== '/dashboard/force-reset') {
    redirect('/dashboard/force-reset')
  }

  if (!setupCompleted && !isSetup && !isForceReset && !testDataEnabled && !isDeveloper) {
    redirect('/dashboard/setup')
  }

  if (isSetup || isForceReset) {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={!autoCollapse} className="h-svh overflow-hidden print:h-auto print:overflow-visible">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      <AppSidebar
        permissions={effectivePerms}
        settings={settings}
        isDeveloper={isDeveloper}
        staff={
          staffMember
            ? {
                first_name: staffMember.first_name,
                last_name: staffMember.last_name,
                email: staffMember.email,
                position: staffMember.position,
              }
            : undefined
        }
      />
      <SidebarInset className="print:m-0 print:rounded-none print:shadow-none">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:hidden print:hidden">
          <SidebarTrigger className="print:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4 print:hidden" />
          <span className="text-sm font-semibold print:hidden">{branding.hoaName}</span>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 print:overflow-visible print:p-0"
        >
          <DashboardAlerts
            testDataEnabled={testDataEnabled}
            hideTestDataAlert={hideTestData}
            setupCompleted={setupCompleted}
            isDeveloper={isDeveloper}
          />
          <RouteMotion className="min-h-full">
            {isAuthorized ? (
              children
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
                  <CardHeader>
                    <div className="flex items-center space-x-2 text-destructive">
                      <ShieldAlert className="size-5" />
                      <CardTitle className="text-xl">Access Denied</CardTitle>
                    </div>
                    <CardDescription>
                      You do not have permissions to access this page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Please contact an administrator if you believe this is an error or need access to the{' '}
                    <strong>{pathname}</strong> section.
                  </CardContent>
                </Card>
              </div>
            )}
          </RouteMotion>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
