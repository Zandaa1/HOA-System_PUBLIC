
import { createClient } from '@/lib/supabase/server'
import { WaterBill, WaterReading } from '@/lib/types/database'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { ViolationAlert } from './violation-alert'
import { PortalRenterManager } from '@/components/portal-renter-manager'
import { getBranding } from '@/lib/branding'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DollarSign, 
  BellRing, 
  Droplet, 
  Car, 
  Calendar, 
  Users, 
  Info, 
  Phone,
  Mail,
  MapPin,
  Shield,
  ShieldAlert,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  // 1. Fetch system settings for contact info and payment options
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
  const settingsMap = (settings || []).reduce(
    (acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }),
    {} as Record<string, string>
  )
  const branding = getBranding(settings || [])

  // 2. Fetch property details
  const { data: property } = await supabase
    .from('properties')
    .select('*, property_types(name, color)')
    .eq('id', residentSession.property_id)
    .single()

  // 3. Fetch invoices for the property
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      billing_period:billing_periods(name)
    `)
    .eq('property_id', residentSession.property_id)
    .order('due_date', { ascending: false })

  let totalOutstanding = 0
  let totalBilled = 0
  let totalPaid = 0
  
  if (invoices) {
    invoices.forEach(inv => {
      if (inv.status !== 'cancelled') {
        totalBilled += Number(inv.total_amount || 0)
        totalPaid += Number(inv.amount_paid || 0)
        if (inv.status === 'pending' || inv.status === 'overdue') {
          totalOutstanding += Number(inv.balance || 0)
        }
      }
    })
  }

  const unpaidInvoices = (invoices || []).filter(inv => 
    inv.status === 'pending' || inv.status === 'overdue'
  )

  // 4. Check if water billing is enabled
  const isWaterEnabled = settingsMap['enable_water_billing'] === 'true'

  // 5. Fetch water meter and recent bills (only if water billing is enabled)
  let activeMeter = null
  let waterBills: (WaterBill & { reading: WaterReading | null })[] = []

  if (isWaterEnabled) {
    const { data: meters } = await supabase
      .from('water_meters')
      .select('*')
      .eq('property_id', residentSession.property_id)
      .eq('is_active', true)
    activeMeter = meters?.[0] || null

    if (activeMeter) {
      const { data: bills } = await supabase
        .from('water_bills')
        .select(`
          *,
          reading:water_readings(*)
        `)
        .eq('property_id', residentSession.property_id)
        .order('created_at', { ascending: false })
        .limit(6)
      waterBills = (bills as any) || []
    }
  }

  // 6. Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('property_id', residentSession.property_id)

  // 7. Fetch upcoming amenity bookings (future bookings)
  const { data: bookings } = await supabase
    .from('amenity_bookings')
    .select(`
      id,
      booking_date,
      start_time,
      end_time,
      status,
      num_guests,
      total_amount,
      amenity:amenities(name)
    `)
    .eq('property_id', residentSession.property_id)
    .gte('booking_date', new Date().toISOString().split('T')[0])
    .order('booking_date', { ascending: true })

  // 8. Fetch household roster (homeowners and renters)
  const { data: homeowners } = await supabase
    .from('homeowners')
    .select('id, first_name, last_name, email, phone, is_residing')
    .eq('property_id', residentSession.property_id)

  // Fetch active renters for renter users, or all renters for homeowner management
  const rentersQuery = supabase
    .from('renters')
    .select('id, first_name, last_name, middle_name, email, phone, is_active')
    .eq('property_id', residentSession.property_id)

  if (residentSession.resident_type === 'renter') {
    rentersQuery.eq('is_active', true)
  }

  const { data: renters } = await rentersQuery

  // 10. Fetch active violations
  const { data: activeViolations } = await supabase
    .from('violations')
    .select(`
      *,
      category:violation_categories(name)
    `)
    .eq('property_id', residentSession.property_id)
    .in('status', ['warning_issued', 'fine_issued'])
    .eq('portal_alert_dismissed', false)

  // 9. Fetch recent announcements (including alerts)
  const { data: announcements } = await supabase
    .from('announcements')
    .select('title, content, created_at, is_alert')
    .order('created_at', { ascending: false })
    .limit(6)

  const alertAnnouncements = (announcements || []).filter((a: any) => a.is_alert)
  const regularAnnouncements = (announcements || []).filter((a: any) => !a.is_alert).slice(0, 3)

  // Calculate sticker status/warning lists
  const now = new Date()
  const stickerAlerts = (vehicles || []).map(v => {
    if (!v.is_active) {
      if (v.sticker_invoice_id) {
        const inv = (invoices || []).find(i => i.id === v.sticker_invoice_id)
        if (inv && inv.status !== 'paid') {
          return { type: 'unpaid', vehicle: v, invoice: inv }
        }
      }
      return null
    }
    if (v.sticker_expires_at) {
      const expiry = new Date(v.sticker_expires_at)
      const diffTime = expiry.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 0) {
        return { type: 'expired', vehicle: v, days: diffDays }
      } else if (diffDays <= 30) {
        return { type: 'expiring', vehicle: v, days: diffDays }
      }
    }
    return null
  }).filter(Boolean) as Array<
    | { type: 'unpaid'; vehicle: any; invoice: any }
    | { type: 'expired'; vehicle: any; days: number }
    | { type: 'expiring'; vehicle: any; days: number }
  >

  const getGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good morning'
    if (hours < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getStatusBadge = (status: string) => {
    if (['paid', 'pending', 'overdue', 'cancelled'].includes(status)) {
      return <StatusBadge type="invoice" status={status} />
    }
    return <Badge variant="secondary" className="capitalize">{status}</Badge>
  }

  const fmtCurrency = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-12">
      {/* 1. Header Box */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {residentSession.first_name}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Personal portal for Block {residentSession.block} Lot {residentSession.lot} · {branding.hoaName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {property?.property_types && (
            <Badge variant="outline" className="text-xs py-1 px-2.5 font-medium border-muted/80">
              <span 
                className="mr-1.5 size-2 rounded-full inline-block" 
                style={{ backgroundColor: property.property_types.color }} 
              />
              {property.property_types.name}
            </Badge>
          )}
          <Badge variant="secondary" className="capitalize text-xs py-1 px-2.5 font-medium">
            {residentSession.resident_type === 'homeowner' ? 'Property Owner' : 'Registered Tenant'}
          </Badge>
          {property?.status && (
            <Badge 
              variant="outline" 
              className={`text-xs py-1 px-2.5 font-medium capitalize ${
                property.status === 'occupied' ? 'bg-status-paid-bg text-status-paid border-status-paid-border' : 'bg-status-inactive-bg text-status-inactive border-status-inactive-border'
              }`}
            >
              {property.status}
            </Badge>
          )}
        </div>
      </div>

      {stickerAlerts && stickerAlerts.length > 0 && (
        <div className="space-y-3 motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
          {stickerAlerts.map((alert, idx) => {
            if (alert.type === 'unpaid') {
              return (
                <div
                  key={`unpaid-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-status-overdue-border bg-status-overdue-bg/80 p-4 text-status-overdue shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="size-5 mt-0.5 text-rose-600 animate-pulse shrink-0" />
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm leading-tight">Unpaid Gate Sticker</h5>
                      <p className="text-xs leading-relaxed text-rose-800">
                        The sticker for your vehicle <strong>{alert.vehicle.plate_number}</strong> ({alert.vehicle.color} {alert.vehicle.brand} {alert.vehicle.model}) is currently unpaid and inactive.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive" asChild className="shrink-0 text-xs h-8 px-3">
                    <Link href={`/portal/billing/invoices/${alert.invoice.id}`}>
                      Pay Invoice {alert.invoice.invoice_number} (₱{alert.invoice.total_amount.toLocaleString()})
                    </Link>
                  </Button>
                </div>
              )
            } else if (alert.type === 'expired') {
              return (
                <div
                  key={`expired-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-status-overdue-border bg-status-overdue-bg/80 p-4 text-status-overdue shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="size-5 mt-0.5 text-rose-600 animate-pulse shrink-0" />
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm leading-tight">Gate Sticker Expired</h5>
                      <p className="text-xs leading-relaxed text-rose-800">
                        The sticker for your vehicle <strong>{alert.vehicle.plate_number}</strong> ({alert.vehicle.color} {alert.vehicle.brand} {alert.vehicle.model}) expired on {new Date(alert.vehicle.sticker_expires_at!).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}. Please request a new sticker.
                      </p>
                    </div>
                  </div>
                  {alert.vehicle.sticker_invoice_id && (
                    <Button size="sm" variant="destructive" asChild className="shrink-0 text-xs h-8 px-3">
                      <Link href={`/portal/billing/invoices/${alert.vehicle.sticker_invoice_id}`}>
                        Renew Sticker / Pay Invoice
                      </Link>
                    </Button>
                  )}
                </div>
              )
            } else {
              return (
                <div
                  key={`expiring-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-status-pending-border bg-status-pending-bg/80 p-4 text-status-pending shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="size-5 mt-0.5 text-amber-600 animate-pulse shrink-0" />
                    <div className="space-y-1">
                      <h5 className="font-bold text-sm leading-tight">Gate Sticker Expiring Soon</h5>
                      <p className="text-xs leading-relaxed text-amber-800">
                        The sticker for your vehicle <strong>{alert.vehicle.plate_number}</strong> ({alert.vehicle.color} {alert.vehicle.brand} {alert.vehicle.model}) will expire in <strong>{alert.days} days</strong> on {new Date(alert.vehicle.sticker_expires_at!).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}.
                      </p>
                    </div>
                  </div>
                  {alert.vehicle.sticker_invoice_id && (
                    <Button size="sm" variant="outline" asChild className="shrink-0 border-status-pending-border text-status-pending hover:bg-status-pending-bg hover:text-status-pending text-xs h-8 px-3">
                      <Link href={`/portal/billing/invoices/${alert.vehicle.sticker_invoice_id}`}>
                        View Invoice
                      </Link>
                    </Button>
                  )}
                </div>
              )
            }
          })}
        </div>
      )}

      {alertAnnouncements && alertAnnouncements.length > 0 && (
        <div className="space-y-3 motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
          {alertAnnouncements.map((alert) => (
            <div
              key={alert.title}
              className="flex items-start gap-3 rounded-lg border border-status-overdue-border bg-status-overdue-bg/80 p-4 text-status-overdue shadow-sm"
            >
              <BellRing className="size-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <h5 className="font-bold text-sm leading-tight">{alert.title}</h5>
                <p className="text-xs leading-relaxed text-rose-800 whitespace-pre-line">{alert.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeViolations && activeViolations.length > 0 && (
        <ViolationAlert violations={activeViolations} />
      )}

      {/* 2. KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Outstanding Dues */}
        <Card className="border-muted/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance Due</CardTitle>
            <DollarSign className={`size-4 shrink-0 ${totalOutstanding > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {fmtCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {totalOutstanding > 0 ? (
                <span className="text-amber-600">Payment required</span>
              ) : (
                <span className="text-emerald-600">Account is current</span>
              )}
            </p>
          </CardContent>
        </Card>

        {isWaterEnabled && (
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Water Consumption</CardTitle>
              <Droplet className="size-4 text-blue-500 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {activeMeter ? `${activeMeter.last_reading_value || 0} m³` : 'No Meter'}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {activeMeter?.last_reading_date ? (
                  <>Last read: {format(new Date(activeMeter.last_reading_date), 'dd MMM yyyy')}</>
                ) : (
                  'No active meter'
                )}
              </p>
            </CardContent>
          </Card>
        )}



        {/* Active Vehicles */}
        <Card className="border-muted/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicles & Stickers</CardTitle>
            <Car className="size-4 text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {(vehicles || []).filter(v => v.is_active && (!v.sticker_expires_at || new Date(v.sticker_expires_at) > now)).length} Active
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {(vehicles || []).length} registered total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabs Interface to Declutter the Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/80 p-1 rounded-lg border w-full flex flex-wrap h-auto gap-1 md:w-max">
          <TabsTrigger value="overview" className="text-xs py-2 px-3 font-medium">Overview</TabsTrigger>
          {isWaterEnabled && <TabsTrigger value="water" className="text-xs py-2 px-3 font-medium">Water Utility</TabsTrigger>}
          <TabsTrigger value="vehicles" className="text-xs py-2 px-3 font-medium">Vehicles &amp; Household</TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs py-2 px-3 font-medium">Amenity Bookings</TabsTrigger>
        </TabsList>

        {/* Overview Tab: Outstanding Dues & Announcements */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left/Main Column - Spans 2 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Outstanding Invoices */}
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="pb-4 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Outstanding Invoices</CardTitle>
                      <CardDescription className="text-xs">Statements requiring immediate payment attention.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-8 font-medium">
                      <Link href="/portal/billing" className="flex items-center gap-1 text-xs">
                        Billing History <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0">
                  {unpaidInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table suppressHydrationWarning>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Invoice #</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unpaidInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                <Link 
                                  href={`/portal/billing/invoices/${invoice.id}`} 
                                  className="font-mono text-primary hover:underline"
                                >
                                  {invoice.invoice_number}
                                </Link>
                              </TableCell>
                              <TableCell>{invoice.billing_period?.name || 'Manual'}</TableCell>
                              <TableCell className="text-muted-foreground font-medium text-xs">
                                {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {fmtCurrency(invoice.total_amount)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-rose-600">
                                {fmtCurrency(invoice.balance)}
                              </TableCell>
                              <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-status-paid-bg/20 border border-dashed rounded-lg border-status-paid-border p-4">
                      <p className="text-sm text-emerald-800 font-bold">All dues paid! Your account is in good standing.</p>
                      <p className="text-xs text-muted-foreground mt-1">Thank you for supporting {branding.hoaName}.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Latest Announcements */}
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="pb-4 pt-5 px-6">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BellRing className="size-4 text-rose-500" />
                    Latest Announcements
                  </CardTitle>
                  <CardDescription className="text-xs">Community updates and official notices from {branding.hoaName}.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-0 space-y-4">
                  {regularAnnouncements && regularAnnouncements.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {regularAnnouncements.map((announcement) => (
                        <div key={announcement.title} className="rounded-lg border p-4 bg-slate-50/40 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-slate-800 leading-tight">{announcement.title}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium font-mono">
                              {format(new Date(announcement.created_at), 'dd MMM')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                            {announcement.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No recent announcements.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right/Sidebar Column - Spans 1 */}
            <div className="space-y-6">
              {/* Payment Quick Guide - always visible above the fold */}
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Info className="size-3.5" />
                    How to Pay
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 text-xs space-y-3 leading-relaxed">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Bank Transfer (BDO)</p>
                    <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Acct Name:</span>
                        <span className="font-bold truncate">{branding.hoaName} Inc.</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Acct #:</span>
                        <span className="font-bold">{settingsMap['bank_account_number'] || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">GCash</p>
                    <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-bold truncate">{settingsMap['gcash_name'] || branding.hoaName}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Number:</span>
                        <span className="font-bold">{settingsMap['gcash_number'] || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-3 border border-primary/10 text-[11px] text-slate-700 leading-relaxed">
                    <p className="font-bold text-primary mb-1 flex items-center gap-1">
                      <HelpCircle className="size-3" />
                      After paying online:
                    </p>
                    Email your transaction screenshot to{' '}
                    <span className="font-bold">{settingsMap['contact_email'] || 'billing@example.invalid'}</span>{' '}
                    with your Block &amp; Lot for verification.
                  </div>
                </CardContent>
              </Card>

              {/* Quick Contacts */}
              <Card className="border-muted/60 shadow-sm">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HOA Admin Desk</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 text-xs space-y-3 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      {settingsMap['association_address'] || branding.hoaAddress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-slate-700">{settingsMap['contact_phone'] || 'Not configured'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-slate-700 truncate" title={settingsMap['contact_email']}>
                      {settingsMap['contact_email'] || 'admin@example.invalid'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/10 text-xs text-slate-700 mt-2">
                    <p className="font-bold text-primary mb-1">Office Hours:</p>
                    Monday to Friday<br />
                    8:00 AM - 5:00 PM
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {isWaterEnabled && (
        <TabsContent value="water" className="outline-none">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Droplet className="size-4 text-blue-500" />
                Water Consumption & Metering
              </CardTitle>
              <CardDescription className="text-xs">
                Monthly water reading logs for Meter #{activeMeter?.meter_number || 'N/A'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              {waterBills.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table suppressHydrationWarning>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Billing Period</TableHead>
                        <TableHead>Reading Date</TableHead>
                        <TableHead className="text-right">Readings (Prev → Curr)</TableHead>
                        <TableHead className="text-right">Consumption</TableHead>
                        <TableHead className="text-right">Amount Billed</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waterBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-semibold">{bill.billing_period}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {bill.reading?.reading_date 
                              ? format(new Date(bill.reading.reading_date), 'dd MMM yyyy') 
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground font-mono">
                            {bill.reading ? `${bill.reading.previous_reading} → ${bill.reading.current_reading} m³` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {bill.consumption.toFixed(1)} m³
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800">
                            {fmtCurrency(bill.amount)}
                          </TableCell>
                          <TableCell>
                            {bill.status === 'paid' ? (
                              <Badge variant="outline" className="bg-status-paid-bg text-status-paid border-status-paid-border font-medium">Paid</Badge>
                            ) : bill.status === 'overdue' ? (
                              <Badge variant="outline" className="bg-status-overdue-bg text-status-overdue border-status-overdue-border font-medium">Overdue</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-status-pending-bg text-status-pending border-status-pending-border font-medium">Unpaid</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground italic">No water consumption records found for this property.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="outline-none">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Car className="size-4 text-amber-500" />
                Registered Household Vehicles
              </CardTitle>
              <CardDescription className="text-xs">
                Vehicles authorized for quick gate entry and issued stickers.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              {vehicles && vehicles.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table suppressHydrationWarning>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate Number</TableHead>
                        <TableHead>Make & Model</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Vehicle Type</TableHead>
                        <TableHead>Sticker Number</TableHead>
                        <TableHead className="w-[100px]">Sticker Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono font-bold text-foreground text-sm uppercase">
                            {v.plate_number}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {v.brand || ''} {v.model || ''}
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground text-xs">{v.color || 'N/A'}</TableCell>
                          <TableCell className="capitalize text-xs font-medium text-slate-700">{v.vehicle_type || 'N/A'}</TableCell>
                          <TableCell className="font-mono font-bold text-primary text-xs">
                            {v.sticker_number ? (
                              <div className="space-y-0.5">
                                <span>{v.sticker_number}</span>
                                {v.sticker_expires_at && (
                                  <p className="text-[10px] text-muted-foreground font-normal">
                                    Expires: {new Date(v.sticker_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic font-normal text-[11px]">Not Assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              if (v.is_active) {
                                if (v.sticker_expires_at) {
                                  const expiry = new Date(v.sticker_expires_at)
                                  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                                  
                                  if (diffDays <= 0) {
                                    return <StatusBadge type="invoice" status="overdue" className="font-medium">Expired</StatusBadge>
                                  } else if (diffDays <= 30) {
                                    return <StatusBadge type="invoice" status="pending" className="font-medium">Expiring Soon ({diffDays}d)</StatusBadge>
                                  }
                                }
                                return <StatusBadge type="invoice" status="paid" className="font-medium">Active</StatusBadge>
                              } else {
                                if (v.sticker_invoice_id) {
                                  const inv = (invoices || []).find(i => i.id === v.sticker_invoice_id)
                                  if (inv && inv.status !== 'paid') {
                                    return (
                                      <Link href={`/portal/billing/invoices/${inv.id}`}>
                                        <Badge variant="outline" className="bg-status-overdue-bg text-status-overdue border-status-overdue-border hover:bg-status-overdue-bg font-bold cursor-pointer">
                                          Unpaid (Pay ₱{inv.total_amount.toLocaleString()})
                                        </Badge>
                                      </Link>
                                    )
                                  }
                                }
                                return (
                                  <Badge variant="outline" className="bg-status-inactive-bg text-status-inactive border-status-inactive-border font-medium">Inactive</Badge>
                                )
                              }
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground italic">No vehicles registered. Please visit the admin office to register your vehicle.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Household Members section */}
          <Card className="border-muted/60 shadow-sm mt-6">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Household Members
              </CardTitle>
              <CardDescription className="text-xs">
                Registered owners and tenants linked to this address.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-3">Homeowners</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {homeowners && homeowners.map((h) => (
                      <div key={h.id} className="flex flex-col gap-1 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{h.first_name} {h.last_name}</span>
                          <Badge variant="outline" className="bg-status-partial-bg text-status-partial border-status-partial-border text-[10px] py-0 font-medium">Owner</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1.5 mt-3">
                          <div className="flex items-center gap-2">
                            <Mail className="size-3.5" />
                            <span className="truncate">{h.email || 'No email registered'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="size-3.5" />
                            <span>{h.phone || 'No phone registered'}</span>
                          </div>
                          {h.is_residing !== null && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-slate-600">
                              <Shield className="size-3.5 text-emerald-500" />
                              {h.is_residing ? 'Residing on property' : 'Off-site owner'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  {residentSession.resident_type === 'homeowner' ? (
                    <PortalRenterManager initialRenters={renters || []} propertyId={residentSession.property_id} />
                  ) : (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-3">Renters (Tenants)</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renters && renters.map((r) => (
                          <div key={r.id} className="flex flex-col gap-1 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800">{r.first_name} {r.last_name}</span>
                              <Badge variant="outline" className="bg-status-partial-bg text-status-partial border-status-partial-border text-[10px] py-0 font-medium">Tenant</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1.5 mt-3">
                              <div className="flex items-center gap-2">
                                <Mail className="size-3.5" />
                                <span className="truncate">{r.email || 'No email registered'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="size-3.5" />
                                <span>{r.phone || 'No phone registered'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="outline-none">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader className="pb-4 pt-5 px-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="size-4 text-violet-500" />
                Amenity Bookings
              </CardTitle>
              <CardDescription className="text-xs">
                Upcoming amenity reservations for your household.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              {bookings && bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table suppressHydrationWarning>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amenity</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time Slot</TableHead>
                        <TableHead className="text-right">Guests</TableHead>
                        <TableHead className="text-right">Booking Fee</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-semibold text-slate-800">
                            {(Array.isArray(booking.amenity) ? booking.amenity[0]?.name : (booking.amenity as any)?.name) || 'Amenity Booking'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(booking.booking_date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700">
                            {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{booking.num_guests}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800 font-mono text-xs">
                            {fmtCurrency(Number(booking.total_amount))}
                          </TableCell>
                          <TableCell>
                            <StatusBadge type="booking" status={booking.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-lg p-6 text-sm text-muted-foreground">
                  <p className="italic">No upcoming amenity bookings found.</p>
                  <p className="mt-1.5 text-xs">To book the pool, clubhouse, or sports court, please visit the HOA administration office.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
