'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MODULES } from '@/lib/modules'
import type { Branding } from '@/lib/branding'
import { LogoUpload } from '@/components/logo-upload'
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, Building2, Plus, Trash2, Upload, Mail, Banknote, HelpCircle, Play } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'
import { getFileUrl } from '@/lib/storage/shared'

interface PropertyTypeRow {
  id: string
  name: string
  description: string
  default_monthly_dues: string
  color: string
}

interface WaterRateRow {
  id: string
  name: string
  min_consumption: string
  max_consumption: string
  rate_per_cubic_meter: string
}

interface PaymentChannelRow {
  id: string
  type: string
  customName?: string
  accountName: string
  accountNumber: string
  qrCodeUrl?: string
}

interface SetupWizardProps {
  initialBranding: Branding
  initialSettings: Array<{ setting_key: string; setting_value: string | null }>
  initialPropertyTypes: Array<{ id: string; name: string; description: string | null; default_monthly_dues: string | null; color: string | null }>
  initialWaterRates: Array<{ id: string; name: string; min_consumption: number; max_consumption: number | null; rate_per_cubic_meter: string | number; is_active: boolean | null }>
  setupDone: boolean
  isDefault: boolean
}

const DEFAULT_COLORS = ['#22c55e', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b']

const BANK_OPTIONS = [
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bdo', label: 'BDO (Banco de Oro)' },
  { value: 'bpi', label: 'BPI (Bank of the Philippine Islands)' },
  { value: 'landbank', label: 'Landbank' },
  { value: 'metrobank', label: 'Metrobank' },
  { value: 'unionbank', label: 'UnionBank' },
  { value: 'others', label: 'Others (Specify name)' },
]

let _nextId = 100
function makeId() {
  return `new_${++_nextId}`
}

export function SetupWizard({ initialBranding, initialSettings, initialPropertyTypes, initialWaterRates, setupDone, isDefault }: SetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [saving, setSaving] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [completed, setCompleted] = useState(setupDone)

  // Property types state
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeRow[]>(
    initialPropertyTypes.map((pt, i) => ({
      id: pt.id,
      name: pt.name,
      description: pt.description || '',
      default_monthly_dues: pt.default_monthly_dues || '0',
      color: pt.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }))
  )

  // Water rates tiers state
  const [waterRates, setWaterRates] = useState<WaterRateRow[]>(() => {
    if (initialWaterRates && initialWaterRates.length > 0) {
      return initialWaterRates.map((wr) => ({
        id: wr.id,
        name: wr.name,
        min_consumption: String(wr.min_consumption),
        max_consumption: wr.max_consumption !== null ? String(wr.max_consumption) : '',
        rate_per_cubic_meter: String(wr.rate_per_cubic_meter),
      }))
    }
    return [
      { id: 'new_1', name: 'Tier 1 - Minimum', min_consumption: '0', max_consumption: '10', rate_per_cubic_meter: '15' },
      { id: 'new_2', name: 'Tier 2 - Normal', min_consumption: '11', max_consumption: '30', rate_per_cubic_meter: '25' },
      { id: 'new_3', name: 'Tier 3 - Excess', min_consumption: '31', max_consumption: '', rate_per_cubic_meter: '40' },
    ]
  })

  const getSetting = (key: string, fallback = '') =>
    initialSettings.find((s) => s.setting_key === key)?.setting_value || fallback

  // Payment channels state
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelRow[]>(() => {
    try {
      const val = getSetting('payment_channels', '[]')
      return JSON.parse(val) || []
    } catch {
      return []
    }
  })

  // Main Form Data
  const [formData, setFormData] = useState<Record<string, string | boolean>>({
    // Step 1: Branding / Profile
    hoa_name: initialBranding.hoaName,
    hoa_full_name: initialBranding.hoaFullName,
    hoa_address: initialBranding.hoaAddress,
    hoa_logo_url: initialBranding.hoaLogoUrl,
    hoa_favicon_url: initialBranding.hoaFaviconUrl,
    hoa_website: initialBranding.hoaWebsite,
    hoa_helpdesk_email: initialBranding.hoaHelpdeskEmail,
    contact_email: getSetting('contact_email', ''),
    contact_phone: getSetting('contact_phone', ''),

    // Step 2: Modules toggles
    ...MODULES.filter((m) => !m.isEssential).reduce(
      (acc, m) => ({ ...acc, [m.key]: getSetting(m.key) !== 'false' }),
      {} as Record<string, boolean>
    ),

    // Step 4: Billing Schedule & Penalties
    monthly_dues_base: getSetting('monthly_dues_base', '500'),
    billing_day: getSetting('billing_day', '1'),
    billing_due_offset_days: getSetting('billing_due_offset_days', '15'),
    auto_generate_dues: getSetting('auto_generate_dues') === 'true',
    enable_auto_penalties: getSetting('enable_auto_penalties') === 'true',
    late_fee_type: getSetting('late_fee_type', 'percentage'),
    late_fee_value: getSetting('late_fee_value', '2'),
    penalty_grace_period_days: getSetting('penalty_grace_period_days', '0'),
    late_fee_frequency: getSetting('late_fee_frequency', 'one_time'),

    // Step 5: Water Billing (Conditional)
    water_base_charge: getSetting('water_base_charge', '0'),
    water_billing_due_offset_days: getSetting('water_billing_due_offset_days', '15'),

    // Step 6: Stickers / Gate (Conditional)
    sticker_fee_amount: getSetting('sticker_fee_amount', '500'),
    ...(() => {
      const days = getSetting('sticker_expiration_warning_days', '30,7').split(',')
      return { sticker_warning_first: days[0] || '30', sticker_warning_second: days[1] || '7' }
    })(),

    // Step 7: Cash Advance (Conditional)
    cash_advance_approval_threshold: getSetting('cash_advance_approval_threshold', '10000'),
    cash_advance_liquidation_deadline_days: getSetting('cash_advance_liquidation_deadline_days', '30'),
    pcf_custodian_name: getSetting('pcf_custodian_name', ''),
    pcf_reimbursement_model: getSetting('pcf_reimbursement_model', 'post_spend'),

    // Step 9: SMTP Config & Alerts
    smtp_host: getSetting('smtp_host', ''),
    smtp_port: getSetting('smtp_port', '587'),
    smtp_username: getSetting('smtp_username', ''),
    smtp_password: getSetting('smtp_password', ''),
    smtp_sender_name: getSetting('smtp_sender_name', ''),
    smtp_sender_email: getSetting('smtp_sender_email', ''),

    notify_invoice_issued: getSetting('notify_invoice_issued') === 'true',
    notify_payment_receipt: getSetting('notify_payment_receipt') === 'true',
    notify_sticker_expiration: getSetting('notify_sticker_expiration') === 'true',
    notify_penalty_applied: getSetting('notify_penalty_applied') === 'true',
    notify_booking_confirmed: getSetting('notify_booking_confirmed') === 'true',
  })

  // Dynamic step logic
  const getActiveSteps = useCallback(() => {
    const stepsList = [
      { id: 'welcome', title: 'Welcome' },
      { id: 'profile', title: 'Profile & Branding' },
      { id: 'modules', title: 'Feature Modules' },
      { id: 'property-types', title: 'Property Types' },
      { id: 'billing', title: 'Dues & Penalties' },
    ]

    if (formData.enable_water_billing) {
      stepsList.push({ id: 'water-billing', title: 'Water Metering' })
    }
    if (formData.enable_gate) {
      stepsList.push({ id: 'gate-stickers', title: 'Vehicle Stickers' })
    }
    if (formData.enable_cash_advances) {
      stepsList.push({ id: 'cash-advances', title: 'Cash Advance limits' })
    }

    stepsList.push(
      { id: 'payment-channels', title: 'E-Wallet & Banks' },
      { id: 'smtp', title: 'SMTP & Alerts' },
      { id: 'finish', title: 'Finish & Initialize' }
    )

    return stepsList
  }, [formData])

  const activeSteps = getActiveSteps()
  const currentStep = activeSteps[step] || activeSteps[0]

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleToggle = (key: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: checked }))
  }

  // Property types management
  const addPropertyType = () => {
    setPropertyTypes((prev) => [
      ...prev,
      { id: makeId(), name: '', description: '', default_monthly_dues: '0', color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length] },
    ])
  }
  const removePropertyType = (id: string) => {
    setPropertyTypes((prev) => prev.filter((pt) => pt.id !== id))
  }
  const updatePropertyType = (id: string, field: keyof PropertyTypeRow, value: string) => {
    setPropertyTypes((prev) => prev.map((pt) => (pt.id === id ? { ...pt, [field]: value } : pt)))
  }

  // Water rates tiers management
  const addWaterRate = () => {
    setWaterRates((prev) => [
      ...prev,
      { id: makeId(), name: `Tier ${prev.length + 1}`, min_consumption: '', max_consumption: '', rate_per_cubic_meter: '' },
    ])
  }
  const removeWaterRate = (id: string) => {
    setWaterRates((prev) => prev.filter((wr) => wr.id !== id))
  }
  const updateWaterRate = (id: string, field: keyof WaterRateRow, value: string) => {
    setWaterRates((prev) => prev.map((wr) => (wr.id === id ? { ...wr, [field]: value } : wr)))
  }

  // Payment channels management
  const addPaymentChannel = () => {
    setPaymentChannels((prev) => [
      ...prev,
      { id: makeId(), type: 'gcash', accountName: '', accountNumber: '', qrCodeUrl: '' },
    ])
  }
  const removePaymentChannel = (id: string) => {
    setPaymentChannels((prev) => prev.filter((c) => c.id !== id))
  }
  const updatePaymentChannel = (id: string, field: keyof PaymentChannelRow, value: string) => {
    setPaymentChannels((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  // QR Code Upload for Payment Channels
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const handleQRUpload = async (channelId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    try {
      const existingPath = paymentChannels.find((c) => c.id === channelId)?.qrCodeUrl
      const uploaded = await uploadAppFile(file, { directory: 'payment-channels' })
      if (existingPath) await deleteAppFile(existingPath).catch(() => {})
      updatePaymentChannel(channelId, 'qrCodeUrl', uploaded.path)
      toast.success('QR Code uploaded successfully')
    } catch (err) {
      toast.error('Failed to upload QR Code')
      console.error(err)
    }
  }

  const handleTestSmtp = async () => {
    if (!formData.smtp_host || !formData.smtp_username || !formData.smtp_sender_email) {
      toast.error('Please fill in SMTP Host, Username, and Sender Email first')
      return
    }

    setTestingSmtp(true)

    const fd = new FormData()
    fd.append('host', formData.smtp_host as string)
    fd.append('port', formData.smtp_port as string)
    fd.append('username', formData.smtp_username as string)
    fd.append('password', formData.smtp_password as string)
    fd.append('senderName', formData.smtp_sender_name as string || 'HOA System')
    fd.append('senderEmail', formData.smtp_sender_email as string || 'noreply@example.invalid')

    const { testSmtpConnection } = await import('@/lib/actions/test-smtp')
    const result = await testSmtpConnection(fd)

    setTestingSmtp(false)
    if (result.success) {
      toast.success(`SMTP connection OK (${result.host}:${result.port})`)
    } else {
      toast.error(`SMTP connection failed: ${result.error}`)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const updates: Array<{ setting_key: string; setting_value: string }> = [
        { setting_key: 'hoa_name', setting_value: formData.hoa_name as string },
        { setting_key: 'hoa_full_name', setting_value: formData.hoa_full_name as string },
        { setting_key: 'hoa_address', setting_value: formData.hoa_address as string },
        { setting_key: 'hoa_logo_url', setting_value: formData.hoa_logo_url as string },
        { setting_key: 'hoa_favicon_url', setting_value: formData.hoa_favicon_url as string },
        { setting_key: 'hoa_website', setting_value: formData.hoa_website as string },
        { setting_key: 'hoa_helpdesk_email', setting_value: formData.hoa_helpdesk_email as string },
        { setting_key: 'contact_email', setting_value: formData.contact_email as string },
        { setting_key: 'contact_phone', setting_value: formData.contact_phone as string },
        { setting_key: 'monthly_dues_base', setting_value: formData.monthly_dues_base as string },
        { setting_key: 'billing_day', setting_value: formData.billing_day as string },
        { setting_key: 'billing_due_offset_days', setting_value: formData.billing_due_offset_days as string },
        { setting_key: 'auto_generate_dues', setting_value: formData.auto_generate_dues ? 'true' : 'false' },
        { setting_key: 'enable_auto_penalties', setting_value: formData.enable_auto_penalties ? 'true' : 'false' },
        { setting_key: 'late_fee_type', setting_value: formData.late_fee_type as string },
        { setting_key: 'late_fee_value', setting_value: formData.late_fee_value as string },
        { setting_key: 'penalty_grace_period_days', setting_value: formData.penalty_grace_period_days as string },
        { setting_key: 'late_fee_frequency', setting_value: formData.late_fee_frequency as string },

        { setting_key: 'water_base_charge', setting_value: formData.water_base_charge as string },
        { setting_key: 'water_billing_due_offset_days', setting_value: formData.water_billing_due_offset_days as string },

        { setting_key: 'sticker_fee_amount', setting_value: formData.sticker_fee_amount as string },
        { setting_key: 'sticker_expiration_warning_days', setting_value: `${formData.sticker_warning_first || '30'},${formData.sticker_warning_second || '7'}` },

        { setting_key: 'cash_advance_approval_threshold', setting_value: formData.cash_advance_approval_threshold as string },
        { setting_key: 'cash_advance_liquidation_deadline_days', setting_value: formData.cash_advance_liquidation_deadline_days as string },
        { setting_key: 'pcf_custodian_name', setting_value: formData.pcf_custodian_name as string },
        { setting_key: 'pcf_reimbursement_model', setting_value: formData.pcf_reimbursement_model as string },

        { setting_key: 'smtp_host', setting_value: formData.smtp_host as string },
        { setting_key: 'smtp_port', setting_value: formData.smtp_port as string },
        { setting_key: 'smtp_username', setting_value: formData.smtp_username as string },
        { setting_key: 'smtp_password', setting_value: formData.smtp_password as string },
        { setting_key: 'smtp_sender_name', setting_value: formData.smtp_sender_name as string },
        { setting_key: 'smtp_sender_email', setting_value: formData.smtp_sender_email as string },

        { setting_key: 'notify_invoice_issued', setting_value: formData.notify_invoice_issued ? 'true' : 'false' },
        { setting_key: 'notify_payment_receipt', setting_value: formData.notify_payment_receipt ? 'true' : 'false' },
        { setting_key: 'notify_sticker_expiration', setting_value: formData.notify_sticker_expiration ? 'true' : 'false' },
        { setting_key: 'notify_penalty_applied', setting_value: formData.notify_penalty_applied ? 'true' : 'false' },
        { setting_key: 'notify_booking_confirmed', setting_value: formData.notify_booking_confirmed ? 'true' : 'false' },

        { setting_key: 'payment_channels', setting_value: JSON.stringify(paymentChannels) },
        { setting_key: 'setup_completed', setting_value: 'true' },
      ]

      // Add module toggles
      for (const mod of MODULES) {
        if (!mod.isEssential) {
          updates.push({
            setting_key: mod.key,
            setting_value: formData[mod.key] ? 'true' : 'false',
          })
        }
      }

      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' })

      if (settingsError) throw settingsError

      // Upsert property types
      const validTypes = propertyTypes.filter((pt) => pt.name.trim())
      for (const pt of validTypes) {
        const { error: ptError } = await supabase.from('property_types').upsert(
          {
            id: pt.id.startsWith('new_') ? undefined : pt.id,
            name: pt.name.trim(),
            description: pt.description.trim() || null,
            default_monthly_dues: pt.default_monthly_dues || '0',
            color: pt.color || null,
          },
          { onConflict: 'name' }
        )
        if (ptError) throw ptError
      }

      // Upsert water rates (if enabled)
      if (formData.enable_water_billing) {
        const validRates = waterRates.filter((r) => r.name.trim())
        for (const wr of validRates) {
          const { error: wrError } = await supabase.from('water_rates').upsert(
            {
              id: wr.id.startsWith('new_') ? undefined : wr.id,
              name: wr.name.trim(),
              min_consumption: parseFloat(wr.min_consumption) || 0,
              max_consumption: wr.max_consumption.trim() ? parseFloat(wr.max_consumption) : null,
              rate_per_cubic_meter: parseFloat(wr.rate_per_cubic_meter) || 0,
              effective_from: '2026-01-01',
              is_active: true,
            }
          )
          if (wrError) throw wrError
        }
      }

      setCompleted(true)
      toast.success('Setup completed successfully!')
      router.refresh()
    } catch (err) {
      toast.error('Failed to save settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Setup Complete</CardTitle>
            <CardDescription>
              Your HOA management platform is configured. You can modify any of these settings later from the Settings page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="default" onClick={async () => {
              const supabase = createClient()
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                await supabase.auth.updateUser({
                  data: { ...user.user_metadata, onboarding_seen: true },
                })
              }
              window.location.href = '/dashboard'
            }}>
              Go to Dashboard
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              For support, contact <a href="mailto:support@example.invalid" className="text-primary hover:underline">support@example.invalid</a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (setupDone && !isDefault) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Building2 className="mx-auto mb-4 size-12 text-primary" />
            <CardTitle className="text-2xl">Already Configured</CardTitle>
            <CardDescription>
              Your HOA settings have already been configured. You can update them anytime from{' '}
              <strong>Settings → General</strong> in the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground">
              For support, contact <a href="mailto:support@example.invalid" className="text-primary hover:underline">support@example.invalid</a>
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => { window.location.href = '/dashboard' }}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar with quick Logout */}
      <header className="flex h-14 items-center justify-between border-b px-6 bg-card shrink-0">
        <span className="text-sm font-semibold">{formData.hoa_name || 'HOA System'}</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/auth/login'
          }}
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Log Out
        </Button>
      </header>

      {/* Main wizard layout */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 lg:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: timeline stepper */}
        <div className="lg:col-span-1">
          {/* Mobile top progress indicator */}
          <div className="lg:hidden mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Setup Progress</span>
              <span className="text-primary font-mono">{step + 1} / {activeSteps.length}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div 
                className="h-full bg-primary transition-[width] duration-300 ease-out" 
                style={{ width: `${((step + 1) / activeSteps.length) * 100}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-foreground pt-1">
              {currentStep.title}
            </p>
          </div>

          {/* Desktop timeline stepper */}
          <div className="hidden lg:block space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Configuration</h2>
              <p className="text-xs text-muted-foreground mt-1">Set up HOA System</p>
            </div>
            
            <div className="relative border-l border-border pl-6 ml-3 space-y-6 py-2">
              {activeSteps.map((s, i) => {
                const isCompleted = i < step
                const isActive = i === step
                const isUpcoming = i > step
                
                return (
                  <div key={s.id} className="relative flex items-start group">
                    <div className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="size-4 text-primary bg-background ring-4 ring-background rounded-full shrink-0" />
                      ) : isActive ? (
                        <div className="size-4 rounded-full bg-background border-2 border-primary flex items-center justify-center ring-4 ring-background">
                          <div className="size-1.5 rounded-full bg-primary" />
                        </div>
                      ) : (
                        <div className="size-4 rounded-full bg-background border border-muted-foreground/30 flex items-center justify-center ring-4 ring-background">
                          <div className="size-1 rounded-full bg-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-xs font-semibold transition-colors",
                        isActive && "text-primary font-bold",
                        isCompleted && "text-foreground",
                        isUpcoming && "text-muted-foreground/60"
                      )}>
                        {s.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Current step
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Step card */}
        <div className="lg:col-span-3">
          <div
            key={currentStep.id}
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-both",
              direction === 'forward'
                ? "motion-safe:slide-in-from-right-4"
                : "motion-safe:slide-in-from-left-4"
            )}
          >
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border bg-muted/5 p-6">
                <div className="flex items-start justify-between w-full">
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">{currentStep.title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {currentStep.id === 'welcome' && 'Welcome to your HOA Management Platform! Let us get your subdivision set up.'}
                      {currentStep.id === 'profile' && 'Define your homeowners association details and visual branding.'}
                      {currentStep.id === 'modules' && 'Which features should be active on the platform?'}
                      {currentStep.id === 'property-types' && 'Configure property classifications in your subdivision.'}
                      {currentStep.id === 'billing' && 'Automate monthly dues generation and penalty parameters.'}
                      {currentStep.id === 'water-billing' && 'Configure tiers and charges for automatic water calculations.'}
                      {currentStep.id === 'gate-stickers' && 'Set up automated rules for vehicle registry and car stickers.'}
                      {currentStep.id === 'cash-advances' && 'Configure approval thresholds and limits for cash advances.'}
                      {currentStep.id === 'payment-channels' && 'Set up E-wallets or bank accounts for direct resident deposits.'}
                      {currentStep.id === 'smtp' && 'Set SMTP credentials and toggle automated notification triggers.'}
                      {currentStep.id === 'finish' && 'Review your settings summary before initializing.'}
                    </CardDescription>
                  </div>
                  <span className="hidden lg:inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary font-mono self-start">
                    Step {step + 1} of {activeSteps.length}
                  </span>
                </div>
              </CardHeader>

          <CardContent className="space-y-6">
            {/* Step: Welcome */}
            {currentStep.id === 'welcome' && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 pb-2">
                  <span className="text-4xl">👋</span>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Hello!</h3>
                    <p className="text-sm text-muted-foreground">Welcome to your HOA Management Platform.</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This onboarding setup wizard will configure default billing rules, utility pricing tiers,
                  vehicle stickers, and branding info so that the platform virtually runs itself.
                </p>
                <div className="rounded-lg border border-status-pending-border bg-status-pending-bg p-4 text-sm text-status-pending">
                  <strong>Note:</strong> You can edit any parameter configured during this setup later in the sidebar settings.
                </div>
              </div>
            )}

            {/* Step: Profile & Branding */}
            {currentStep.id === 'profile' && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="hoa_name">Short HOA Name</Label>
                  <Input
                    id="hoa_name"
                    value={formData.hoa_name as string}
                    onChange={(e) => handleChange('hoa_name', e.target.value)}
                    placeholder="e.g. HOA System"
                  />
                  <p className="text-xs text-muted-foreground">Shown in sidebar and title headings.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hoa_full_name">Full Subdivision Name</Label>
                  <Input
                    id="hoa_full_name"
                    value={formData.hoa_full_name as string}
                    onChange={(e) => handleChange('hoa_full_name', e.target.value)}
                    placeholder="e.g. HOA System"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hoa_address">HOA Office Address</Label>
                  <Input
                    id="hoa_address"
                    value={formData.hoa_address as string}
                    onChange={(e) => handleChange('hoa_address', e.target.value)}
                    placeholder="Demo community address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contact_email">Primary Email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email as string}
                      onChange={(e) => handleChange('contact_email', e.target.value)}
                      placeholder="office@example.invalid"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact_phone">Support Phone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone as string}
                      onChange={(e) => handleChange('contact_phone', e.target.value)}
                      placeholder="+63 2 8123 4567"
                    />
                  </div>
                </div>
                <LogoUpload
                  currentUrl={formData.hoa_logo_url as string}
                  onUrlChange={(url) => handleChange('hoa_logo_url', url)}
                  label="HOA Logo Image"
                />
              </div>
            )}

            {/* Step: Module Toggles */}
            {currentStep.id === 'modules' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select which modules are required. Steps for disabled modules will be skipped dynamically.
                </p>
                <div className="space-y-3 divide-y divide-border">
                  {MODULES.filter((m) => !m.isEssential).map((mod) => (
                    <div key={mod.key} className="flex items-center justify-between pt-3 first:pt-0">
                      <div className="space-y-0.5">
                        <Label htmlFor={`setup-${mod.key}`}>{mod.label}</Label>
                        <p className="text-xs text-muted-foreground">{mod.description}</p>
                      </div>
                      <Switch
                        id={`setup-${mod.key}`}
                        checked={formData[mod.key] as boolean}
                        onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Property Types */}
            {currentStep.id === 'property-types' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Define property types and default dues. Dues will automatically bill residents according to their property type.
                </p>
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                  {propertyTypes.map((pt) => (
                    <div key={pt.id} className="rounded-lg border p-3 space-y-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 grid gap-2">
                          <Label className="text-xs">Type Name</Label>
                          <Input
                            value={pt.name}
                            onChange={(e) => updatePropertyType(pt.id, 'name', e.target.value)}
                            placeholder="e.g. Residential"
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 shrink-0 mt-5"
                          onClick={() => removePropertyType(pt.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="text-xs">Dues (₱)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pt.default_monthly_dues}
                            onChange={(e) => updatePropertyType(pt.id, 'default_monthly_dues', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Map Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={pt.color}
                              onChange={(e) => updatePropertyType(pt.id, 'color', e.target.value)}
                              className="size-8 cursor-pointer rounded border p-0.5"
                            />
                            <Input
                              value={pt.color}
                              onChange={(e) => updatePropertyType(pt.id, 'color', e.target.value)}
                              className="h-8 text-sm font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addPropertyType}>
                  <Plus className="mr-2 size-4" />
                  Add Property Type
                </Button>
              </div>
            )}

            {/* Step: Billing & Penalties */}
            {currentStep.id === 'billing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="billing_day">Monthly Billing Day</Label>
                    <Input
                      id="billing_day"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billing_day as string}
                      onChange={(e) => handleChange('billing_day', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Day invoices are generated.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billing_due_offset_days">Due Period (Days)</Label>
                    <Input
                      id="billing_due_offset_days"
                      type="number"
                      min="1"
                      value={formData.billing_due_offset_days as string}
                      onChange={(e) => handleChange('billing_due_offset_days', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Days until overdue mark.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_generate_dues">Automated Billing Generation</Label>
                    <p className="text-xs text-muted-foreground">Automatically issue invoices on the billing day.</p>
                  </div>
                  <Switch
                    id="auto_generate_dues"
                    checked={formData.auto_generate_dues as boolean}
                    onCheckedChange={(checked) => handleToggle('auto_generate_dues', checked)}
                  />
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_auto_penalties">Automated Penalties</Label>
                    <p className="text-xs text-muted-foreground">Automatically post late fees after due date.</p>
                  </div>
                  <Switch
                    id="enable_auto_penalties"
                    checked={formData.enable_auto_penalties as boolean}
                    onCheckedChange={(checked) => handleToggle('enable_auto_penalties', checked)}
                  />
                </div>

                {formData.enable_auto_penalties && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="late_fee_type">Penalty Calculation</Label>
                        <select
                          id="late_fee_type"
                          value={formData.late_fee_type as string}
                          onChange={(e) => handleChange('late_fee_type', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Rate (₱)</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="late_fee_value">
                          {formData.late_fee_type === 'fixed' ? 'Amount (₱)' : 'Rate (%)'}
                        </Label>
                        <Input
                          id="late_fee_value"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.late_fee_value as string}
                          onChange={(e) => handleChange('late_fee_value', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="penalty_grace_period_days">Grace Period (Days)</Label>
                        <Input
                          id="penalty_grace_period_days"
                          type="number"
                          min="0"
                          value={formData.penalty_grace_period_days as string}
                          onChange={(e) => handleChange('penalty_grace_period_days', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Days past due before late fees post.</p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="late_fee_frequency">Accrual Occurrence</Label>
                        <select
                          id="late_fee_frequency"
                          value={formData.late_fee_frequency as string}
                          onChange={(e) => handleChange('late_fee_frequency', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="one_time">One-time Fee</option>
                          <option value="monthly_recurring">Monthly Recurring</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Water Metering Rates (Conditional) */}
            {currentStep.id === 'water-billing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="water_base_charge">Base Charge (₱)</Label>
                    <Input
                      id="water_base_charge"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.water_base_charge as string}
                      onChange={(e) => handleChange('water_base_charge', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Monthly meter charge.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="water_billing_due_offset_days">Due Period (Days)</Label>
                    <Input
                      id="water_billing_due_offset_days"
                      type="number"
                      min="1"
                      value={formData.water_billing_due_offset_days as string}
                      onChange={(e) => handleChange('water_billing_due_offset_days', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Days until water bill overdue.</p>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold">Tier Rates Structure</Label>
                  <p className="text-xs text-muted-foreground">Tiers define progressive billing based on consumption volume (m³).</p>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {waterRates.map((wr) => (
                      <div key={wr.id} className="grid grid-cols-12 gap-2 items-center rounded border p-2 bg-card">
                        <div className="col-span-3 grid gap-1">
                          <Label className="text-[10px]">Tier Label</Label>
                          <Input
                            value={wr.name}
                            onChange={(e) => updateWaterRate(wr.id, 'name', e.target.value)}
                            placeholder="Tier name"
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="col-span-2 grid gap-1">
                          <Label className="text-[10px]">Min (m³)</Label>
                          <Input
                            type="number"
                            value={wr.min_consumption}
                            onChange={(e) => updateWaterRate(wr.id, 'min_consumption', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="col-span-2 grid gap-1">
                          <Label className="text-[10px]">Max (m³)</Label>
                          <Input
                            type="number"
                            placeholder="No limit"
                            value={wr.max_consumption}
                            onChange={(e) => updateWaterRate(wr.id, 'max_consumption', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="col-span-3 grid gap-1">
                          <Label className="text-[10px]">Rate (₱/m³)</Label>
                          <Input
                            type="number"
                            value={wr.rate_per_cubic_meter}
                            onChange={(e) => updateWaterRate(wr.id, 'rate_per_cubic_meter', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="col-span-2 text-center pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7"
                            onClick={() => removeWaterRate(wr.id)}
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addWaterRate} className="mt-1">
                    <Plus className="mr-2 size-3.5" />
                    Add Tier
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Gate & Stickers Rules (Conditional) */}
            {currentStep.id === 'gate-stickers' && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="sticker_fee_amount">Sticker Registration Fee (₱)</Label>
                  <Input
                    id="sticker_fee_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sticker_fee_amount as string}
                    onChange={(e) => handleChange('sticker_fee_amount', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Stickers remain inactive until payment invoice matches.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Sticker Expiration Warnings</Label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        id="sticker_warning_first"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.sticker_warning_first as string}
                        onChange={(e) => handleChange('sticker_warning_first', e.target.value)}
                        placeholder="30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">First warning (days before expiry)</p>
                    </div>
                    <div className="flex-1">
                      <Input
                        id="sticker_warning_second"
                        type="number"
                        min="1"
                        max="365"
                        value={formData.sticker_warning_second as string}
                        onChange={(e) => handleChange('sticker_warning_second', e.target.value)}
                        placeholder="7"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Second warning (days before expiry)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Cash Advance Limits (Conditional) */}
            {currentStep.id === 'cash-advances' && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="cash_advance_approval_threshold">Co-signature Approval Threshold (₱)</Label>
                  <Input
                    id="cash_advance_approval_threshold"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.cash_advance_approval_threshold as string}
                    onChange={(e) => handleChange('cash_advance_approval_threshold', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Limits above which president signature is required.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cash_advance_liquidation_deadline_days">Liquidation Deadline Period (Days)</Label>
                  <Input
                    id="cash_advance_liquidation_deadline_days"
                    type="number"
                    min="1"
                    value={formData.cash_advance_liquidation_deadline_days as string}
                    onChange={(e) => handleChange('cash_advance_liquidation_deadline_days', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pcf_custodian_name">Petty Cash Custodian Name</Label>
                  <Input
                    id="pcf_custodian_name"
                    value={formData.pcf_custodian_name as string}
                    onChange={(e) => handleChange('pcf_custodian_name', e.target.value)}
                    placeholder="e.g. Ms. Tess"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pcf_reimbursement_model">PCF Operating Model</Label>
                  <select
                    id="pcf_reimbursement_model"
                    value={formData.pcf_reimbursement_model as string}
                    onChange={(e) => handleChange('pcf_reimbursement_model', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="post_spend">Post-spend reimbursement (No pre-approval)</option>
                    <option value="pre_approval">Pre-approval required</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step: E-Wallet & Banks Settings */}
            {currentStep.id === 'payment-channels' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add e-wallets or bank channels. Configured channels will display QR codes or account numbers in the resident portal.
                </p>
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
                  {paymentChannels.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
                      No payment channels added yet. Add a channel to allow electronic payments.
                    </div>
                  ) : (
                    paymentChannels.map((c) => (
                      <div key={c.id} className="rounded-lg border p-3 space-y-3 bg-card relative">
                        <div className="grid grid-cols-2 gap-3 pt-4">
                          <div className="grid gap-1">
                            <Label className="text-xs">Channel Type</Label>
                            <select
                              value={c.type}
                              onChange={(e) => updatePaymentChannel(c.id, 'type', e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {BANK_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {c.type === 'others' && (
                            <div className="grid gap-1">
                              <Label className="text-xs">Bank Name</Label>
                              <Input
                                value={c.customName || ''}
                                onChange={(e) => updatePaymentChannel(c.id, 'customName', e.target.value)}
                                placeholder="Specify Bank / E-Wallet"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-1">
                            <Label className="text-xs">Account Name</Label>
                            <Input
                              value={c.accountName}
                              onChange={(e) => updatePaymentChannel(c.id, 'accountName', e.target.value)}
                              placeholder="Account owner name"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">Account / Phone Number</Label>
                            <Input
                              value={c.accountNumber}
                              onChange={(e) => updatePaymentChannel(c.id, 'accountNumber', e.target.value)}
                              placeholder="09xx-xxx-xxxx / xxxx-xxxx"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        {/* E-wallet QR upload */}
                        {(c.type === 'gcash' || c.type === 'maya') && (
                          <div className="border-t pt-2 mt-2 space-y-2">
                            <Label className="text-[11px] font-semibold">QR Code Image</Label>
                            <div className="flex items-center gap-3">
                              <div className="relative size-12 border rounded bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                {c.qrCodeUrl ? (
                                  <Image
                                    src={getFileUrl(c.qrCodeUrl)}
                                    alt="QR Preview"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                ) : (
                                  <Upload className="size-4 text-muted-foreground/40" />
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => fileInputRefs.current[c.id]?.click()}
                                >
                                  Upload QR
                                </Button>
                                {c.qrCodeUrl && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      void deleteAppFile(c.qrCodeUrl).catch(() => {})
                                      updatePaymentChannel(c.id, 'qrCodeUrl', '')
                                    }}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <input
                                ref={(el) => {
                                  fileInputRefs.current[c.id] = el
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleQRUpload(c.id, file)
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 absolute top-1 right-1"
                          onClick={() => removePaymentChannel(c.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={addPaymentChannel}>
                  <Plus className="mr-2 size-4" />
                  Add Payment Channel
                </Button>
              </div>
            )}

            {/* Step: Notification SMTP & Alerts */}
            {currentStep.id === 'smtp' && (
              <div className="space-y-4">
                <div className="rounded border p-3 bg-muted/10 space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Mail className="size-4" />
                    SMTP Configuration
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 grid gap-1">
                      <Label className="text-xs">SMTP Host</Label>
                      <Input
                        value={formData.smtp_host as string}
                        onChange={(e) => handleChange('smtp_host', e.target.value)}
                        placeholder="localhost"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Port</Label>
                      <Input
                        value={formData.smtp_port as string}
                        onChange={(e) => handleChange('smtp_port', e.target.value)}
                        placeholder="587"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Username</Label>
                      <Input
                        value={formData.smtp_username as string}
                        onChange={(e) => handleChange('smtp_username', e.target.value)}
                        placeholder="user@example.com"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Password</Label>
                      <Input
                        type="password"
                        value={formData.smtp_password as string}
                        onChange={(e) => handleChange('smtp_password', e.target.value)}
                        placeholder="••••••••"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Sender Name</Label>
                      <Input
                        value={formData.smtp_sender_name as string}
                        onChange={(e) => handleChange('smtp_sender_name', e.target.value)}
                        placeholder="HOA System"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Sender Email</Label>
                      <Input
                        value={formData.smtp_sender_email as string}
                        onChange={(e) => handleChange('smtp_sender_email', e.target.value)}
                        placeholder="noreply@example.invalid"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs w-full"
                    disabled={testingSmtp}
                    onClick={handleTestSmtp}
                  >
                    {testingSmtp ? (
                      <Loader2 className="mr-2 size-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 size-3" />
                    )}
                    Test SMTP Connection
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Automated Email Triggers</Label>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      {[formData.notify_invoice_issued, formData.notify_payment_receipt, formData.notify_penalty_applied, formData.enable_gate && formData.notify_sticker_expiration, formData.enable_amenities && formData.notify_booking_confirmed].filter(Boolean).length} / {[true, true, true, formData.enable_gate, formData.enable_amenities].filter(Boolean).length} active
                    </span>
                  </div>

                  <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Financial</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify_invoice_issued" className="text-xs">Invoice Issued</Label>
                          <p className="text-[10px] text-muted-foreground">Email invoice statements on creation.</p>
                        </div>
                        <Switch
                          id="notify_invoice_issued"
                          checked={formData.notify_invoice_issued as boolean}
                          onCheckedChange={(checked) => handleToggle('notify_invoice_issued', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify_payment_receipt" className="text-xs">Payment Received</Label>
                          <p className="text-[10px] text-muted-foreground">Email official receipts on payment approval.</p>
                        </div>
                        <Switch
                          id="notify_payment_receipt"
                          checked={formData.notify_payment_receipt as boolean}
                          onCheckedChange={(checked) => handleToggle('notify_payment_receipt', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="notify_penalty_applied" className="text-xs">Late Penalty</Label>
                          <p className="text-[10px] text-muted-foreground">Notify residents when late fees post.</p>
                        </div>
                        <Switch
                          id="notify_penalty_applied"
                          checked={formData.notify_penalty_applied as boolean}
                          onCheckedChange={(checked) => handleToggle('notify_penalty_applied', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  {(formData.enable_gate || formData.enable_amenities) && (
                    <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Property</p>
                      <div className="space-y-2">
                        {formData.enable_gate && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="notify_sticker_expiration" className="text-xs">Sticker Expiration</Label>
                              <p className="text-[10px] text-muted-foreground">Email vehicle sticker expiry warnings.</p>
                            </div>
                            <Switch
                              id="notify_sticker_expiration"
                              checked={formData.notify_sticker_expiration as boolean}
                              onCheckedChange={(checked) => handleToggle('notify_sticker_expiration', checked)}
                            />
                          </div>
                        )}
                        {formData.enable_amenities && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="notify_booking_confirmed" className="text-xs">Booking Confirmation</Label>
                              <p className="text-[10px] text-muted-foreground">Email facility reservation details.</p>
                            </div>
                            <Switch
                              id="notify_booking_confirmed"
                              checked={formData.notify_booking_confirmed as boolean}
                              onCheckedChange={(checked) => handleToggle('notify_booking_confirmed', checked)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step: Finish & Initialize (Review Summary) */}
            {currentStep.id === 'finish' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                  {/* Subdivision Profile Card */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Subdivision Profile</p>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formData.hoa_name}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({formData.hoa_full_name})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formData.hoa_address}</p>
                      <div className="text-[11px] text-muted-foreground border-t pt-1.5 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Office: <strong className="text-foreground font-medium">{formData.contact_email}</strong></span>
                        <span>Phone: <strong className="text-foreground font-medium">{formData.contact_phone}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Automated Billing Card */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Automated Billing & Penalties</p>
                    <div className="space-y-1 text-xs">
                      <p className="text-muted-foreground">
                        Billing day: <strong className="text-foreground font-semibold">Day {formData.billing_day}</strong> · Due window: <strong className="text-foreground font-semibold">{formData.billing_due_offset_days} Days</strong>
                      </p>
                      <p className="text-muted-foreground">
                        Auto Generation: <strong className="text-foreground font-semibold">{formData.auto_generate_dues ? 'Enabled' : 'Disabled'}</strong>
                      </p>
                      <p className="text-[11px] text-muted-foreground border-t pt-1.5 mt-1.5">
                        Auto Penalty: <strong className="text-foreground font-medium">{formData.enable_auto_penalties ? `Active (${formData.late_fee_type === 'fixed' ? `₱${formData.late_fee_value}` : `${formData.late_fee_value}%`} late fee, ${formData.penalty_grace_period_days}d grace, ${formData.late_fee_frequency === 'one_time' ? 'once' : 'monthly'})` : 'Disabled'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Water Utilities Card */}
                  {formData.enable_water_billing && (
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Water Utilities</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">
                          Base charge: <strong className="text-foreground font-semibold">₱{formData.water_base_charge}</strong> · Due window: <strong className="text-foreground font-semibold">{formData.water_billing_due_offset_days} Days</strong>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2 border-t pt-1.5">
                          {waterRates.map((wr) => (
                            <span
                              key={wr.id}
                              className="inline-flex items-center rounded bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/10"
                            >
                              {wr.name}: ₱{wr.rate_per_cubic_meter}/m³
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gate Sticker Rules Card */}
                  {formData.enable_gate && (
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Gate Sticker Rules</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          Sticker cost: <strong className="text-foreground font-semibold">₱{formData.sticker_fee_amount}</strong> · Lifespan: <strong className="text-foreground font-semibold">12 Months</strong>
                        </p>
                        <p className="text-[11px] border-t pt-1.5 mt-1.5">
                          Exp warnings: first at <strong className="text-foreground font-medium">{formData.sticker_warning_first || '30'}d</strong>, second at <strong className="text-foreground font-medium">{formData.sticker_warning_second || '7'}d</strong> before expiry.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods Card */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Configured E-Payment Methods</p>
                    {paymentChannels.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">No bank accounts/e-wallets set up.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5 mt-1 max-h-[120px] overflow-y-auto">
                        {paymentChannels.map((c) => (
                          <div key={c.id} className="text-[11px] border rounded px-2 py-1 bg-muted/5 flex justify-between items-center">
                            <div>
                              <span className="font-semibold capitalize text-foreground">{c.type === 'others' ? c.customName || 'Other' : c.type}</span>
                              <span className="text-muted-foreground"> · {c.accountName}</span>
                            </div>
                            <div className="font-mono text-muted-foreground">{c.accountNumber}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-status-pending-border bg-status-pending-bg p-3 text-xs text-status-pending">
                  Ready to launch! Completing setup will activate all system configurations.
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t border-border bg-muted/5 p-6 flex justify-between">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (step === 0) {
                  window.location.href = '/dashboard'
                } else {
                  setDirection('backward')
                  setStep(step - 1)
                }
              }}
            >
              <ChevronLeft className="mr-2 size-4" />
              {step === 0 ? 'Skip Setup' : 'Back'}
            </Button>

            {step < activeSteps.length - 1 ? (
              <Button
                onClick={() => {
                  setDirection('forward')
                  setStep(step + 1)
                }}
              >
                Next
                <ChevronRight className="ml-2 size-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                Initialize Platform
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
</div>
</div>
  )
}
