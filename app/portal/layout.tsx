import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getResidentSession } from '@/lib/supabase/resident'
import { getBranding } from '@/lib/branding'
import { LogOut, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InitialsAvatar } from '@/components/ui/initials-avatar'
import { PortalMobileHeader } from './portal-mobile-header'
import { portalNavItems } from '@/lib/portal-nav'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
  const branding = getBranding(settings || [])

  const handleLogout = async () => {
    'use server'
    const logoutSupabase = await createClient()
    await logoutSupabase.auth.signOut()
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/portal/auth`, {
      method: 'DELETE',
    })
    if (response.ok) {
      redirect('/auth/login')
    }
  }

  return (
    <div className="flex min-h-svh w-full bg-muted/40">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      {/* Sidebar for larger screens */}
      <aside className="sticky top-0 hidden h-svh w-64 flex-col border-r bg-background p-4 lg:flex print:hidden">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/portal" className="flex items-center gap-2 text-foreground">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div className="grid flex-1 text-left text-xs leading-tight">
              <span className="font-bold text-sm tracking-tight">{branding.hoaName}</span>
              <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold">Management Platform</span>
            </div>
          </Link>
        </div>
        <nav aria-label="Resident portal navigation" className="flex-1 space-y-2 py-4">
          {portalNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
               className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-ring/50"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-4" suppressHydrationWarning>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <InitialsAvatar
              firstName={residentSession.first_name}
              lastName={residentSession.last_name}
              className="size-9 shrink-0"
            />
            <div>
              <p>
                {residentSession.first_name} {residentSession.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Blk {residentSession.block} Lot {residentSession.lot}
              </p>
            </div>
          </div>
          <form action={handleLogout}>
            <Button
              variant="ghost"
              type="submit"
              className="mt-4 w-full justify-start text-muted-foreground hover:text-primary"
            >
              <LogOut className="mr-3 size-5" />
              Logout
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <PortalMobileHeader
          branding={branding}
          residentName={`${residentSession.first_name} ${residentSession.last_name}`}
          residentFirstName={residentSession.first_name}
          residentLastName={residentSession.last_name}
          residentLocation={`Blk ${residentSession.block} Lot ${residentSession.lot}`}
          logoutAction={handleLogout}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 p-6 md:p-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
