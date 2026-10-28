
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Shield, 
  Activity, 
  ScrollText, 
  Mail, 
  Settings, 
  UserCheck, 
  RefreshCw, 
  CheckCircle, 
  Server, 
  Eye, 
  ArrowRight,
  Users,
  Map
} from 'lucide-react'
import { toast } from 'sonner'
import { setMasterAccount, sendTestEmailAction } from './actions'
import { MapBorderEditor } from './map-border-editor'

interface DeveloperClientProps {
  initialStaff: any[]
  initialHomeowners: any[]
  initialLogs: any[]
  initialSettings: any[]
  kpis: {
    staffCount: number
    homeownersCount: number
    vehiclesCount: number
    settingsCount: number
    logsCount: number
  }
  initialBoundary: number[][][] | null
}

const actionColors: Record<string, string> = {
  INSERT: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  UPDATE: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  DELETE: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
}

export function DeveloperClient({ initialStaff, initialHomeowners, initialLogs, initialSettings, kpis, initialBoundary }: DeveloperClientProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedMasterId, setSelectedMasterId] = useState(
    initialSettings.find((s) => s.setting_key === 'client_master_account_id')?.setting_value || ''
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [pinging, setPinging] = useState(false)
  const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testEmailRecipient, setTestEmailRecipient] = useState('admin@example.invalid')
  const [selectedEmailType, setSelectedEmailType] = useState('credential-welcome')
  const [sendingEmail, setSendingEmail] = useState(false)

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.error('Please enter a recipient email address')
      return
    }

    setSendingEmail(true)
    try {
      await sendTestEmailAction(selectedEmailType, testEmailRecipient)
      toast.success(`Success! Simulated email (${selectedEmailType}) sent to ${testEmailRecipient}`)
    } catch (err: any) {
      toast.error(`Failed to send email: ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const currentMasterAccount = initialHomeowners.find((h) => h.user_id === selectedMasterId) || 
                               initialStaff.find((s) => s.user_id === selectedMasterId)

  // Filter homeowners/staff for master selection
  const filteredPeople = [...initialStaff.map(s => ({ id: s.user_id, name: `${s.first_name} ${s.last_name} (Staff)`, email: s.email, user_id: s.user_id })),
                          ...initialHomeowners.map(h => ({ id: h.user_id, name: `${h.first_name} ${h.last_name} (Resident)`, email: h.email, user_id: h.user_id }))]
                          .filter(p => p.user_id && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))))

  const handleSetMaster = async (userId: string) => {
    setLoadingAction('set_master')
    try {
      await setMasterAccount(userId)
      setSelectedMasterId(userId)
      toast.success('Client Master Account updated successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(`Failed to update Master Account: ${err.message}`)
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePingSmtp = async () => {
    setPinging(true)
    setPingStatus('idle')
    const { pingSmtp } = await import('@/lib/actions/test-smtp')
    const result = await pingSmtp()
    setPinging(false)
    if (result.success) {
      setPingStatus('success')
      toast.success(`SMTP connection OK (${result.host}:${result.port})`)
    } else {
      setPingStatus('error')
      toast.error(`SMTP connection failed: ${result.error}`)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-surface border-outline shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Staff Members</CardTitle>
            <Users className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight">{kpis.staffCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Active administrative users</p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-outline shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Residents</CardTitle>
            <UserCheck className="size-4 text-secondary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight">{kpis.homeownersCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Homeowners registered</p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-outline shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vehicles</CardTitle>
            <Activity className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight">{kpis.vehiclesCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Gate passes monitored</p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-outline shadow-sm">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">System Settings</CardTitle>
            <Settings className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold tracking-tight">{kpis.settingsCount}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Active configuration keys</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Layout */}
      <Tabs defaultValue="access" className="space-y-4">
        <TabsList className="bg-surface border p-1 rounded-lg">
          <TabsTrigger value="access" className="flex items-center gap-1.5"><Shield className="size-3.5" /> Access Control</TabsTrigger>
          <TabsTrigger value="auditing" className="flex items-center gap-1.5"><ScrollText className="size-3.5" /> Audit Logs</TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-1.5"><Mail className="size-3.5" /> Email Diagnostics</TabsTrigger>
          <TabsTrigger value="env" className="flex items-center gap-1.5"><Server className="size-3.5" /> Environment</TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-1.5"><Map className="size-3.5" /> Map Border</TabsTrigger>
        </TabsList>

        {/* Tab 1: Access Control & Impersonation */}
        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Master Account</CardTitle>
              <CardDescription>
                Select the root administrator account representing the subdivision client owner. This account holds final authority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Master Owner</p>
                    <p className="text-sm font-semibold text-primary">
                      {currentMasterAccount 
                        ? `${currentMasterAccount.first_name} ${currentMasterAccount.last_name} (${currentMasterAccount.email})` 
                        : 'Not assigned'}
                    </p>
                  </div>
                  {currentMasterAccount && (
                    <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border font-bold">
                      Root Admin
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="search-user" className="text-sm font-semibold">Change Master Account</Label>
                <div className="flex gap-2">
                  <Input
                    id="search-user"
                    placeholder="Search residents or staff by name/email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md h-9 text-sm"
                  />
                </div>
                {searchTerm && (
                  <div className="border rounded-lg max-w-md max-h-[160px] overflow-y-auto bg-surface mt-1 divide-y">
                    {filteredPeople.map((person) => (
                      <div 
                        key={person.id} 
                        className="p-2 flex items-center justify-between hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          handleSetMaster(person.user_id)
                          setSearchTerm('')
                        }}
                      >
                        <div className="text-xs">
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-muted-foreground">{person.email}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 flex items-center gap-1">
                          Assign <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    ))}
                    {filteredPeople.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground text-center italic">
                        No matches found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff & Access</CardTitle>
              <CardDescription>
                Listing active staff members and their direct access settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table suppressHydrationWarning>
                <TableHeader>
                  <TableRow className="bg-muted/25">
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Name</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Email</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialStaff.map((staff) => {
                    const isMaster = staff.user_id === selectedMasterId
                    return (
                      <TableRow key={staff.id} className="hover:bg-muted/10">
                        <TableCell className="px-6 py-3 text-sm font-medium">
                          {staff.first_name} {staff.last_name}
                          {isMaster && (
                            <Badge className="ml-2 bg-status-paid-bg text-status-paid border border-status-paid-border text-[9px] font-bold">
                              Master Owner
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-3 text-xs text-muted-foreground">{staff.email || '—'}</TableCell>
                        <TableCell className="px-6 py-3">
                          {isMaster ? (
                            <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[10px] font-bold">
                              Full Bypass (All)
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {staff.permissions?.all ? (
                                <Badge className="bg-status-partial-bg text-status-partial border border-status-partial-border text-[10px] font-bold">
                                  Full Access
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Checklist</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: System Logs & Audit Explorer */}
        <TabsContent value="auditing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Auditing Log</CardTitle>
              <CardDescription>
                Recent database writes monitored system-wide.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table suppressHydrationWarning>
                <TableHeader>
                  <TableRow className="bg-muted/25">
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Timestamp</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Action</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Entity</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Staff</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialLogs.slice(0, 10).map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/10">
                      <TableCell className="px-6 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Badge className={`text-[10px] font-bold border ${actionColors[log.action] || ''}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <span className="text-sm font-semibold capitalize">{log.entity_type}</span>
                        <span className="block font-mono text-[10px] text-muted-foreground max-w-[120px] truncate mt-0.5">
                          {log.entity_id}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-3 text-sm font-medium">
                        {log.staff
                          ? `${log.staff.first_name} ${log.staff.last_name}`
                          : <span className="text-xs text-muted-foreground font-normal">System</span>}
                      </TableCell>
                      <TableCell className="px-6 py-3 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <Eye className="size-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Audit Diff details</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-2">
                              <div>
                                <h4 className="text-xs font-bold mb-2 uppercase text-muted-foreground">Before Change</h4>
                                <pre className="bg-muted p-3 rounded text-[11px] font-mono overflow-auto max-h-[300px] border">
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'No previous values'}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold mb-2 uppercase text-muted-foreground">After Change</h4>
                                <pre className="bg-muted p-3 rounded text-[11px] font-mono overflow-auto max-h-[300px] border">
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'No new values'}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {initialLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic text-sm">
                        No audit records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: SMTP Diagnostics & Alerts */}
        <TabsContent value="smtp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Diagnostic Ping</CardTitle>
              <CardDescription>
                Check the mail server availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 border rounded p-4 bg-muted/20">
                <div className="grid gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Server Host</span>
                  <span className="text-sm font-semibold">{initialSettings.find(s => s.setting_key === 'smtp_host')?.setting_value || '—'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Port</span>
                  <span className="text-sm font-semibold">{initialSettings.find(s => s.setting_key === 'smtp_port')?.setting_value || '587'}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Sender Email Address</span>
                  <span className="text-sm font-semibold">{initialSettings.find(s => s.setting_key === 'smtp_sender_email')?.setting_value || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t pt-4">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handlePingSmtp}
                  disabled={pinging}
                >
                  {pinging ? (
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                  ) : (
                    'Ping Host'
                  )}
                </Button>
                {pingStatus === 'success' && (
                  <span className="text-xs font-semibold text-status-paid flex items-center gap-1">
                    <CheckCircle className="size-4" /> Connected successfully
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simulate Transactional Emails</CardTitle>
              <CardDescription>
                Send mock transactional emails to any address to verify formatting and mail delivery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="test-recipient" className="text-xs font-semibold">Recipient Email</Label>
                  <Input
                    id="test-recipient"
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="e.g. admin@example.invalid"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="test-email-type" className="text-xs font-semibold">Email Type</Label>
                  <select
                    id="test-email-type"
                    value={selectedEmailType}
                    onChange={(e) => setSelectedEmailType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="credential-welcome">Resident Credentials Welcome</option>
                    <option value="invoice-issued">Invoice Statement Issued</option>
                    <option value="payment-receipt">Payment Confirmation / Receipt</option>
                    <option value="sticker-expiration">RFID Gate Sticker Expiration Warning</option>
                    <option value="penalty-applied">Late Penalty Charge Applied</option>
                    <option value="booking-confirmed">Amenity Booking Confirmation</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={sendingEmail}
                  className="font-semibold text-xs h-9"
                >
                  {sendingEmail ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Sending test email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 size-4" />
                      Send Simulated Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mailer Delivery Logs</CardTitle>
              <CardDescription>
                Last automated notifications triggered.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table suppressHydrationWarning>
                <TableHeader>
                  <TableRow className="bg-muted/25">
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Recipient</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Email Template</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Delivery Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-6 py-4 text-sm font-medium">demo.resident@example.invalid</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-mono text-muted-foreground">monthly_dues_invoice</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[9px] font-bold uppercase">
                        Sent (200 OK)
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-4 text-sm font-medium">demo.resident@example.invalid</TableCell>
                    <TableCell className="px-6 py-4 text-xs font-mono text-muted-foreground">cash_advance_review</TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[9px] font-bold uppercase">
                        Sent (200 OK)
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Environment Flags */}
        <TabsContent value="env" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Row Level Security Policies (RLS)</CardTitle>
              <CardDescription>
                Verifying schema table protection bounds in the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table suppressHydrationWarning>
                <TableHeader>
                  <TableRow className="bg-muted/25">
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Database Table</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">RLS protection</TableHead>
                    <TableHead className="px-6 text-xs uppercase tracking-widest font-bold">Write Gating Policy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-bold">system_settings</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">public.is_staff()</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-bold">invoices</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">public.is_staff()</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-bold">vehicles</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">public.is_staff()</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-bold">water_rates</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge className="bg-status-paid-bg text-status-paid border border-status-paid-border text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">public.is_staff()</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Environment Context</CardTitle>
              <CardDescription>
                System variables loaded from server config.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table suppressHydrationWarning>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-semibold">Active Server timezone</TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">Asia/Manila (PST)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-semibold">Subdivision Bounds</TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">HOA System, Quezon City</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-3 text-sm font-semibold">Default Currency Format</TableCell>
                    <TableCell className="px-6 py-3 text-xs font-mono text-muted-foreground">PHP (₱)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Map Border Editor */}
        <TabsContent value="map" className="space-y-4">
          <MapBorderEditor initialGeometry={initialBoundary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
