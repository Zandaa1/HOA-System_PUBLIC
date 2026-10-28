
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Building2, Users, Receipt, CreditCard, AlertTriangle,
  CarFront, CalendarPlus, Zap,
  Megaphone, Wrench, ShieldAlert, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardCalendar } from '@/components/dashboard-calendar'
import { DashboardGreeting } from '@/components/dashboard-greeting'
import { KpiStrip, type KpiItem } from '@/components/dashboard/kpi-strip'
import { AttentionQueue, type AttentionSection } from '@/components/dashboard/attention-queue'
import { FinancePanel } from '@/components/dashboard/finance-panel'
import { OccupancyRing } from '@/components/dashboard/occupancy-ring'
import { QuickActions, type QuickAction } from '@/components/dashboard/quick-actions'
import { getEnabledModules } from '@/lib/modules'

const getCachedCounts = unstable_cache(
  async () => {
    const sb = await createAdminClient()
    return Promise.all([
      sb.from('properties').select('*', { count: 'exact', head: true }),
      sb.from('homeowners').select('*', { count: 'exact', head: true }),
      sb.from('renters').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('properties').select('status'),
      sb.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(1),
    ])
  },
  ['dashboard-counts-v2'],
  { revalidate: 60, tags: ['dashboard-counts'] }
)

async function getDashboardData() {
  const supabase = await createClient()

  const now = new Date()
  const firstStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const lastStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  const sixMonthsAgo = `${now.getFullYear() - (now.getMonth() < 5 ? 1 : 0)}-${String((now.getMonth() + 8) % 12 || 12).padStart(2, '0')}-01`

  const { data: settings } = await supabase.from('system_settings').select('setting_key, setting_value')
  const enabledModules = getEnabledModules(settings || [])

  const amenitiesEnabled = enabledModules.has('enable_amenities')
  const violationsEnabled = enabledModules.has('enable_violations')
  const maintenanceEnabled = enabledModules.has('enable_maintenance')

  const queries: any[] = [
    getCachedCounts(),

    // Outstanding (pending + overdue) — for the attention queue + KPIs
    supabase.from('invoices').select('id, invoice_number, status, balance, due_date, property:properties(block, lot)')
      .in('status', ['pending', 'overdue'])
      .gt('balance', 0)
      .order('due_date', { ascending: true })
      .limit(20),

    // Recent payments for the activity feed
    supabase.from('payments')
      .select('id, payment_number, amount, payment_date, payment_method, invoice:invoices(invoice_number, property:properties(block, lot))')
      .order('created_at', { ascending: false })
      .limit(8),

    // Chart: payments last 6 months
    supabase.from('payments')
      .select('amount, payment_date')
      .gte('payment_date', sixMonthsAgo),

    // Chart: invoices last 6 months
    supabase.from('invoices')
      .select('total_amount, issue_date')
      .gte('issue_date', sixMonthsAgo),
  ]

  if (amenitiesEnabled) {
    queries.push(
      supabase.from('amenity_bookings')
        .select('id, booking_date, booked_by_name, amenity:amenities(name)')
        .eq('status', 'pending')
        .gte('booking_date', firstStr)
        .order('booking_date')
        .limit(5),
      supabase.from('amenity_bookings')
        .select('id, booking_date, booked_by_name, start_time, end_time, status, amenity:amenities(name, color)')
        .gte('booking_date', firstStr)
        .lte('booking_date', lastStr)
        .neq('status', 'cancelled')
        .order('booking_date'),
    )
  } else {
    queries.push(Promise.resolve({ data: [] }), Promise.resolve({ data: [] }))
  }

  if (violationsEnabled) {
    queries.push(
      supabase.from('violations')
        .select('id, title, status, fine_applied, incident_date, property:properties(block, lot)')
        .in('status', ['warning_issued', 'fine_issued'])
        .order('created_at', { ascending: false })
        .limit(3),
    )
  } else {
    queries.push(Promise.resolve({ data: [] }))
  }

  if (maintenanceEnabled) {
    queries.push(
      supabase.from('maintenance_requests')
        .select('id, title, status, priority, created_at, property:properties(block, lot)')
        .in('status', ['pending', 'assigned', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(3),
    )
  } else {
    queries.push(Promise.resolve({ data: [] }))
  }

  const [
    [{ count: propertiesCount }, { count: homeownersCount }, { count: rentersCount }, { data: allProperties }, { data: latestAnnouncement }],
    { data: openInvoices },
    { data: recentPayments },
    { data: chartPayments },
    { data: chartInvoices },
    { data: pendingBookings },
    { data: bookingsThisMonth },
    { data: openViolations },
    { data: openMaintenance },
  ] = await Promise.all(queries)

  // KPIs
  const totalOutstanding = (openInvoices as any[]).reduce((s: number, i: any) => s + Number(i.balance), 0)
  const pendingCount = (openInvoices as any[]).filter((i: any) => i.status === 'pending').length
  const overdueCount = (openInvoices as any[]).filter((i: any) => i.status === 'overdue').length

  // Occupancy by status
  const byStatus: Record<string, number> = {}
  for (const p of allProperties || []) {
    const s = (p as any).status || 'vacant'
    byStatus[s] = (byStatus[s] || 0) + 1
  }

  // Financial chart data
  const monthMap: Record<string, { invoiced: number; collected: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap[key] = { invoiced: 0, collected: 0 }
  }
  for (const p of chartPayments || []) {
    const key = (p.payment_date || '').slice(0, 7)
    if (monthMap[key]) monthMap[key].collected += Number(p.amount)
  }
  for (const inv of chartInvoices || []) {
    const key = (inv.issue_date || '').slice(0, 7)
    if (monthMap[key]) monthMap[key].invoiced += Number(inv.total_amount)
  }
  const chartData = Object.entries(monthMap).map(([ym, vals]) => {
    const d = new Date(ym + '-01')
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      ...vals,
    }
  })
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonth = monthMap[thisMonthKey] || { invoiced: 0, collected: 0 }

  // Calendar bookings (if amenities enabled)
  const calendarBookings = amenitiesEnabled
    ? (bookingsThisMonth || []).map((b: any) => ({
        id: b.id,
        booking_date: b.booking_date,
        booked_by_name: b.booked_by_name,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status,
        amenity_name: b.amenity?.name ?? null,
        amenity_color: b.amenity?.color ?? null,
      }))
    : []

  // This-month booking count (for KPIs)
  const bookingsThisMonthCount = (bookingsThisMonth || []).length

  return {
    stats: {
      properties: propertiesCount || 0,
      homeowners: homeownersCount || 0,
      renters: rentersCount || 0,
      pendingCount,
      overdueCount,
      totalOutstanding,
    },
    openInvoices: openInvoices || [],
    openViolations: openViolations || [],
    openMaintenance: openMaintenance || [],
    pendingBookings: pendingBookings || [],
    recentPayments: recentPayments || [],
    chartData,
    thisMonthInvoiced: thisMonth.invoiced,
    thisMonthCollected: thisMonth.collected,
    calendarBookings,
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth(),
    byStatus,
    latestAnnouncement: latestAnnouncement?.[0] || null,
    enabledModules,
    amenitiesEnabled,
    violationsEnabled,
    maintenanceEnabled,
    bookingsThisMonthCount,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const {
    stats, openInvoices, openViolations, openMaintenance, pendingBookings,
    recentPayments, chartData, thisMonthInvoiced, thisMonthCollected,
    calendarBookings, calendarYear, calendarMonth, byStatus, latestAnnouncement,
    enabledModules, amenitiesEnabled, violationsEnabled, maintenanceEnabled,
    bookingsThisMonthCount,
  } = data

  const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── KPI strip ──
  const kpis: KpiItem[] = [
    {
      label: 'Outstanding',
      value: fmt(stats.totalOutstanding),
      href: '/dashboard/billing/collections',
      icon: CreditCard,
      accent: 'primary',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount.toString(),
      href: '/dashboard/billing/invoices',
      icon: AlertTriangle,
      accent: stats.overdueCount > 0 ? 'danger' : 'default',
    },
    {
      label: 'Active Owners',
      value: stats.homeowners.toString(),
      href: '/dashboard/residents/homeowners',
      icon: Users,
      accent: 'default',
    },
    {
      label: 'Bookings (mo.)',
      value: bookingsThisMonthCount.toString(),
      href: '/dashboard/amenities/bookings',
      icon: CalendarPlus,
      accent: 'default',
    },
    {
      label: 'Open Violations',
      value: openViolations.length.toString(),
      href: '/dashboard/violations',
      icon: ShieldAlert,
      accent: openViolations.length > 0 ? 'warning' : 'default',
    },
  ]

  // ── Attention Queue sections ──
  const fmtInvoiceMeta = (i: any) => fmt(Number(i.balance))
  const attentionSections: AttentionSection[] = [
    {
      key: 'overdue',
      label: 'Overdue Invoices',
      icon: AlertTriangle,
      viewAllHref: '/dashboard/billing/invoices',
      items: (openInvoices as any[])
        .filter((i) => i.status === 'overdue')
        .slice(0, 4)
        .map((i) => ({
          id: i.id,
          href: `/dashboard/billing/invoices/${i.id}`,
          title: i.invoice_number,
          subtitle: i.property ? `Blk ${i.property.block} Lot ${i.property.lot}` : '—',
          meta: fmtInvoiceMeta(i),
        })),
    },
    {
      key: 'bookings',
      label: 'Pending Bookings',
      icon: CalendarPlus,
      viewAllHref: '/dashboard/amenities/bookings',
      items: amenitiesEnabled
        ? (pendingBookings as any[]).slice(0, 3).map((b) => ({
            id: b.id,
            href: `/dashboard/amenities/bookings/${b.id}`,
            title: b.amenity?.name || 'Booking',
            subtitle: b.booked_by_name || '—',
          }))
        : [],
    },
    {
      key: 'violations',
      label: 'Open Violations',
      icon: ShieldAlert,
      viewAllHref: '/dashboard/violations',
      items: violationsEnabled
        ? (openViolations as any[]).map((v) => ({
            id: v.id,
            href: `/dashboard/violations/${v.id}`,
            title: v.title,
            subtitle: v.property ? `Blk ${v.property.block} Lot ${v.property.lot}` : '—',
            meta: v.fine_applied ? fmt(Number(v.fine_applied)) : undefined,
          }))
        : [],
    },
    {
      key: 'maintenance',
      label: 'Open Maintenance',
      icon: Wrench,
      viewAllHref: '/dashboard/maintenance',
      items: maintenanceEnabled
        ? (openMaintenance as any[]).map((m) => ({
            id: m.id,
            href: `/dashboard/maintenance/${m.id}`,
            title: m.title,
            subtitle: m.property ? `Blk ${m.property.block} Lot ${m.property.lot}` : '—',
          }))
        : [],
    },
  ]

  // ── Quick Actions ──
  const allQuickActions: QuickAction[] = [
    { label: 'New Invoice', href: '/dashboard/billing/invoices/new', icon: 'invoice', color: 'text-sky-600' },
    { label: 'Record Payment', href: '/dashboard/billing/payments/new', icon: 'payment', color: 'text-emerald-600' },
    { label: 'New Booking', href: '/dashboard/amenities/bookings/new', icon: 'booking', color: 'text-violet-600' },
    { label: 'Add Vehicle', href: '/dashboard/vehicles/new', icon: 'vehicle', color: 'text-amber-600' },
    { label: 'Generate Dues', href: '/dashboard/billing/dues', icon: 'dues', color: 'text-orange-600' },
    { label: 'Add Property', href: '/dashboard/properties/new', icon: 'property', color: 'text-slate-600' },
  ]
  const quickActions = allQuickActions.filter(
    (a) => a.label !== 'New Booking' || amenitiesEnabled,
  )

  return (
    <div className="space-y-6">
      {/* Header band: greeting + context chips */}
      <DashboardGreeting
        propertiesCount={stats.properties}
        ownersCount={stats.homeowners}
        enabledModulesCount={enabledModules.size}
      />

      {/* Row 1: Hero KPI strip */}
      <KpiStrip items={kpis} />

      {/* Row 2: 3-column main grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1.3fr_0.9fr]">
        <AttentionQueue sections={attentionSections} />
        <FinancePanel
          chartData={chartData}
          thisMonthInvoiced={thisMonthInvoiced}
          thisMonthCollected={thisMonthCollected}
        />

        {/* Community snapshot — occupancy + latest announcement */}
        <Card className="border-border/60 bg-card shadow-sm h-full">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Community
            </CardTitle>
            <p className="text-xs text-muted-foreground">Property mix & latest update</p>
          </CardHeader>
          <CardContent className="px-6 pb-5 space-y-5">
            <OccupancyRing byStatus={byStatus} total={stats.properties} />
            {latestAnnouncement && (
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Megaphone className="size-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Latest Announcement
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground line-clamp-2">
                  {latestAnnouncement.title}
                </p>
                <Link
                  href="/dashboard/announcements"
                  className="text-[11px] font-semibold text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
                >
                  View all <ExternalLink className="size-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: 2-column secondary — payments + calendar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3 pt-5 px-6 flex-none">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
              <Link
                href="/dashboard/billing/payments"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">Latest cash in</p>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-12 px-6">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentPayments.slice(0, 5).map((p: any) => {
                  const property = p.invoice?.property
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/dashboard/billing/payments/${p.id}`}
                        className="group flex items-center justify-between gap-3 px-6 py-3 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate group-hover:text-primary transition-colors">
                            {property ? `Blk ${property.block} Lot ${property.lot}` : p.payment_number}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.invoice?.invoice_number || p.payment_number} · {p.payment_method}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold tabular-nums text-emerald-600">
                            +{fmt(Number(p.amount))}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {p.payment_date}
                          </p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {amenitiesEnabled ? (
          <DashboardCalendar
            initialBookings={calendarBookings}
            initialYear={calendarYear}
            initialMonth={calendarMonth}
          />
        ) : (
          <Card className="flex flex-col border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex-none">
              <CardTitle className="text-base font-semibold">Amenity Calendar</CardTitle>
              <p className="text-xs text-muted-foreground">Amenities module is disabled</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-muted-foreground italic text-center">
                Enable Amenities in Settings to view the booking calendar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 4: Quick Actions (single component, all breakpoints) */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
          Quick Actions
        </h2>
        <QuickActions actions={quickActions} />
      </div>
    </div>
  )
}
