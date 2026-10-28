'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { SystemSetting } from '@/lib/types/database'
import { MODULES } from '@/lib/modules'
import { LogoUpload } from '@/components/logo-upload'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface SettingsFormProps {
  settings: SystemSetting[]
  isDeveloper?: boolean
}

export function SettingsForm({ settings, isDeveloper = false }: SettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingSmtp, setIsTestingSmtp] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>(
    settings.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value || '' }), {})
  )

  const handleTestSmtp = async () => {
    if (!formData.smtp_host || !formData.smtp_username || !formData.smtp_sender_email) {
      toast.error('Please fill in SMTP Host, Username, and Sender Email first')
      return
    }

    setIsTestingSmtp(true)

    const fd = new FormData()
    fd.append('host', formData.smtp_host)
    fd.append('port', formData.smtp_port || '587')
    fd.append('username', formData.smtp_username)
    fd.append('password', formData.smtp_password)
    fd.append('senderName', formData.smtp_sender_name || 'HOA System')
    fd.append('senderEmail', formData.smtp_sender_email || 'noreply@example.invalid')

    try {
      const { testSmtpConnection } = await import('@/lib/actions/test-smtp')
      const result = await testSmtpConnection(fd)

      if (result.success) {
        toast.success(`SMTP connection OK (${result.host}:${result.port})`)
      } else {
        toast.error(`SMTP connection failed: ${result.error}`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsTestingSmtp(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }))

      // Batch update settings (using upsert since setting_key is usually unique)
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' })

      if (error) throw error

      toast.success('Settings updated successfully')
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const getSetting = (key: string) => settings.find(s => s.setting_key === key)

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="billing">Billing & Fees</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="cash_advances">Cash Advances</TabsTrigger>
          {isDeveloper && <TabsTrigger value="developer">Developer</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Association Information</CardTitle>
              <CardDescription>Basic details about the homeowners association</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="association_name">Association Name</Label>
                <Input
                  id="association_name"
                  value={formData['association_name'] || ''}
                  onChange={(e) => handleChange('association_name', e.target.value)}
                  placeholder="e.g. HOA System Homeowners Association"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="association_address">Office Address</Label>
                <Input
                  id="association_address"
                  value={formData['association_address'] || ''}
                  onChange={(e) => handleChange('association_address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData['contact_email'] || ''}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData['contact_phone'] || ''}
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automated Email Triggers</CardTitle>
              <CardDescription>Choose which events automatically send email notifications to residents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Financial</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_invoice_issued" className="text-xs flex flex-col gap-0.5">
                      <span>Invoice Issued</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Email invoice statements on creation.</span>
                    </Label>
                    <Switch
                      id="notify_invoice_issued"
                      checked={formData['notify_invoice_issued'] === 'true'}
                      onCheckedChange={(checked) => handleChange('notify_invoice_issued', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_payment_receipt" className="text-xs flex flex-col gap-0.5">
                      <span>Payment Received</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Email official receipts on payment approval.</span>
                    </Label>
                    <Switch
                      id="notify_payment_receipt"
                      checked={formData['notify_payment_receipt'] === 'true'}
                      onCheckedChange={(checked) => handleChange('notify_payment_receipt', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_penalty_applied" className="text-xs flex flex-col gap-0.5">
                      <span>Late Penalty</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Notify residents when late fees post.</span>
                    </Label>
                    <Switch
                      id="notify_penalty_applied"
                      checked={formData['notify_penalty_applied'] === 'true'}
                      onCheckedChange={(checked) => handleChange('notify_penalty_applied', checked ? 'true' : 'false')}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Property</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_sticker_expiration" className="text-xs flex flex-col gap-0.5">
                      <span>Sticker Expiration</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Email vehicle sticker expiry warnings.</span>
                    </Label>
                    <Switch
                      id="notify_sticker_expiration"
                      checked={formData['notify_sticker_expiration'] === 'true'}
                      onCheckedChange={(checked) => handleChange('notify_sticker_expiration', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify_booking_confirmed" className="text-xs flex flex-col gap-0.5">
                      <span>Booking Confirmation</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Email facility reservation details.</span>
                    </Label>
                    <Switch
                      id="notify_booking_confirmed"
                      checked={formData['notify_booking_confirmed'] === 'true'}
                      onCheckedChange={(checked) => handleChange('notify_booking_confirmed', checked ? 'true' : 'false')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Module Toggles</CardTitle>
              <CardDescription>Enable or disable optional system modules. Disabled modules are hidden from navigation and their dashboard widgets are removed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODULES.filter((m) => !m.isEssential).map((module) => (
                <div key={module.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={module.key}>{module.label}</Label>
                    <p className="text-xs text-muted-foreground font-normal">{module.description}</p>
                  </div>
                  <Switch
                    id={module.key}
                    checked={formData[module.key] !== 'false'}
                    onCheckedChange={(checked) => handleChange(module.key, checked ? 'true' : 'false')}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Configuration</CardTitle>
              <CardDescription>Global parameters for dues and penalties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="monthly_dues_base">Base Monthly Dues (₱)</Label>
                  <Input
                    id="monthly_dues_base"
                    type="number"
                    step="0.01"
                    value={formData['monthly_dues_base'] || ''}
                    onChange={(e) => handleChange('monthly_dues_base', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_day">Monthly Billing Day</Label>
                  <Input
                    id="billing_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData['billing_day'] || ''}
                    onChange={(e) => handleChange('billing_day', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="late_fee_type">Late Fee Type</Label>
                  <Input
                    id="late_fee_type"
                    value={formData['late_fee_type'] || ''}
                    onChange={(e) => handleChange('late_fee_type', e.target.value)}
                    placeholder="fixed or percentage"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="late_fee_value">Late Fee Value</Label>
                  <Input
                    id="late_fee_value"
                    type="number"
                    step="0.01"
                    value={formData['late_fee_value'] || ''}
                    onChange={(e) => handleChange('late_fee_value', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure SMTP and email delivery parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 grid gap-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={formData['smtp_host'] || ''}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtp_port">Port</Label>
                  <Input
                    id="smtp_port"
                    value={formData['smtp_port'] || ''}
                    onChange={(e) => handleChange('smtp_port', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="smtp_username">Username</Label>
                  <Input
                    id="smtp_username"
                    value={formData['smtp_username'] || ''}
                    onChange={(e) => handleChange('smtp_username', e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtp_password">Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={formData['smtp_password'] || ''}
                    onChange={(e) => handleChange('smtp_password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="smtp_sender_name">Sender Name</Label>
                  <Input
                    id="smtp_sender_name"
                    value={formData['smtp_sender_name'] || ''}
                    onChange={(e) => handleChange('smtp_sender_name', e.target.value)}
                    placeholder="HOA System"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="smtp_sender_email">Sender Email</Label>
                  <Input
                    id="smtp_sender_email"
                    type="email"
                    value={formData['smtp_sender_email'] || ''}
                    onChange={(e) => handleChange('smtp_sender_email', e.target.value)}
                    placeholder="noreply@example.invalid"
                  />
                </div>
              </div>

              <div className="pt-4 border-t mt-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Test Configuration</div>
                  <p className="text-xs text-muted-foreground">Verify SMTP credentials are working before saving.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTestingSmtp}
                  onClick={handleTestSmtp}
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Test SMTP Connection
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash_advances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Advance & PCF Configuration</CardTitle>
              <CardDescription>Configure approval rules, deadlines, and custodian settings for cash advances.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="cash_advance_approval_threshold">Approval Threshold (₱)</Label>
                <p className="text-xs text-muted-foreground/80 -mt-1.5 mb-1">
                  Amount above which the president must co-sign. Set to 0 to require co-sign for all amounts.
                </p>
                <Input
                  id="cash_advance_approval_threshold"
                  type="number"
                  min="0"
                  step="100"
                  value={formData['cash_advance_approval_threshold'] || ''}
                  onChange={(e) => handleChange('cash_advance_approval_threshold', e.target.value)}
                  placeholder="10000"
                  className="max-w-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cash_advance_liquidation_deadline_days">Liquidation Deadline (days)</Label>
                <p className="text-xs text-muted-foreground/80 -mt-1.5 mb-1">
                  Number of days from release date that the advance must be liquidated.
                </p>
                <Input
                  id="cash_advance_liquidation_deadline_days"
                  type="number"
                  min="1"
                  max="180"
                  value={formData['cash_advance_liquidation_deadline_days'] || ''}
                  onChange={(e) => handleChange('cash_advance_liquidation_deadline_days', e.target.value)}
                  placeholder="30"
                  className="max-w-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pcf_custodian_name">PCF Custodian Name</Label>
                <p className="text-xs text-muted-foreground/80 -mt-1.5 mb-1">
                  Person responsible for the Petty Cash Fund.
                </p>
                <Input
                  id="pcf_custodian_name"
                  value={formData['pcf_custodian_name'] || ''}
                  onChange={(e) => handleChange('pcf_custodian_name', e.target.value)}
                  placeholder="Ms. Tess"
                  className="max-w-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pcf_reimbursement_model">PCF Reimbursement Model</Label>
                <p className="text-xs text-muted-foreground/80 -mt-1.5 mb-1">
                  Is the custodian reimbursed after spending, or do they need pre-approval?
                </p>
                <select
                  id="pcf_reimbursement_model"
                  value={formData['pcf_reimbursement_model'] || 'post_spend'}
                  onChange={(e) => handleChange('pcf_reimbursement_model', e.target.value)}
                  className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="post_spend">Post-spend reimbursement (no pre-approval)</option>
                  <option value="pre_approval">Pre-approval required before spending</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isDeveloper && (
          <TabsContent value="developer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Developer Options</CardTitle>
                <CardDescription>Settings intended for development and testing environments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dev_hide_test_data_alert">Hide Test Data Alert</Label>
                    <p className="text-xs text-muted-foreground font-normal">Suppress the red &quot;Test Data Active&quot; banner even when test data is seeded.</p>
                  </div>
                  <Switch
                    id="dev_hide_test_data_alert"
                    checked={formData['dev_hide_test_data_alert'] === 'true'}
                    onCheckedChange={(checked) => handleChange('dev_hide_test_data_alert', checked ? 'true' : 'false')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <div className="mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Settings
        </Button>
      </div>
    </form>
  )
}
