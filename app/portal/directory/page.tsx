
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { getBranding } from '@/lib/branding'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Mail, MapPin, Shield, Wrench, Building2, Clock } from 'lucide-react'

interface Contact {
  title: string
  phone: string
  email?: string
  address?: string
  description: string
  icon: typeof Phone
}

export default async function CommunityDirectoryPage() {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')

  const s = (settings || []).reduce(
    (acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }),
    {} as Record<string, string>
  )
  const branding = getBranding(settings || [])

  const contacts: Contact[] = [
    {
      title: 'HOA Administration Office',
      phone: s['contact_phone'] || 'Not configured',
      email: s['contact_email'] || branding.hoaHelpdeskEmail,
      address: s['association_address'] || branding.hoaAddress,
      description: 'Mon–Fri 8:00 AM – 5:00 PM',
      icon: Building2,
    },
    {
      title: 'Emergency Hotline',
      phone: s['contact_emergency'] || 'Not configured',
      description: 'For emergencies requiring immediate assistance',
      icon: Phone,
    },
    {
      title: 'Security / Gate',
      phone: s['contact_security'] || 'Not configured',
      description: 'Gate access issues, security concerns, visitor inquiries',
      icon: Shield,
    },
    {
      title: 'Maintenance',
      phone: s['contact_maintenance'] || 'Not configured',
      description: 'Report subdivision maintenance issues',
      icon: Wrench,
    },
  ]

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-8">
      <PageHeader
        title="Important Contacts"
        description="Official HOA contact numbers and services."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {contacts.map((c) => (
          <Card key={c.title} className="overflow-hidden border-muted/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <c.icon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{c.title}</CardTitle>
                    {c.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0 text-sm">
              <div className="flex items-center gap-2.5">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <a href={`tel:${c.phone}`} className="font-mono font-semibold text-primary hover:underline">
                  {c.phone}
                </a>
              </div>
              {c.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-primary hover:underline truncate">
                    {c.email}
                  </a>
                </div>
              )}
              {c.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{c.address}</span>
                </div>
              )}
              {c.title === 'HOA Administration Office' && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Mon–Fri 8:00 AM – 5:00 PM</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
