
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Phone, MapPin, ArrowLeft, Globe, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

import { createAdminClient } from '@/lib/supabase/admin'
import { GenerateResidentCredentials } from '@/components/generate-resident-credentials'

interface HomeownerPageProps {
  params: Promise<{ id: string }>
}

export default async function HomeownerDetailPage({ params }: HomeownerPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const { data: homeownerData } = await supabase
    .from('homeowners')
    .select(`
      *,
      property:properties(
        *,
        homeowners(*),
        renters(*)
      )
    `)
    .eq('id', id)
    .single()

  if (!homeownerData) {
    notFound()
  }

  const property = homeownerData.property

  // Get users linked to this property's residents
  const residentUserIds = [
    ...(property?.homeowners?.map((h: any) => h.user_id) || []),
    ...(property?.renters?.map((r: any) => r.user_id) || []),
  ].filter(Boolean) as string[]

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const linkedUsers = authUsers?.users.filter((u) => residentUserIds.includes(u.id)) || []

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${homeownerData.first_name} ${homeownerData.middle_name ? `${homeownerData.middle_name} ` : ''}${homeownerData.last_name}`}
        description="Homeowner Profile"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon-sm" className="size-9 shadow-sm" title="Back to List">
              <Link href="/dashboard/residents/homeowners">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            {property && (
              <GenerateResidentCredentials 
                property={property} 
                linkedUsers={linkedUsers}
                preselectedResidentId={id}
                preselectedResidentType="homeowner"
                triggerVariant={homeownerData.user_id ? "outline" : "default"}
                className="h-9 font-medium shadow-sm uppercase tracking-wide text-xs px-3"
              />
            )}
            <Button asChild size="sm" className="h-9 px-4">
              <Link href={`/dashboard/residents/homeowners/${id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit Profile
              </Link>
            </Button>
          </div>
        }
      >
        <Badge variant="secondary" className={cn(
          "font-bold text-[10px] uppercase border",
          homeownerData.is_residing 
            ? "bg-status-paid-bg text-status-paid border-status-paid-border" 
            : "bg-status-inactive-bg text-status-inactive border-status-inactive-border"
        )}>
          {homeownerData.is_residing ? 'Residing' : 'Non-Residing'}
        </Badge>
        {homeownerData.user_id && (
          <Badge variant="secondary" className="font-bold text-[10px] uppercase border bg-status-paid-bg text-status-paid border-status-paid-border">
            Portal Active
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3 px-6">
        {/* Contact Info */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</span>
              <p className="text-sm font-medium">{homeownerData.email || 'None'}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</span>
              <p className="text-sm font-medium">{homeownerData.phone || 'None'}</p>
            </div>
            {homeownerData.secondary_phone && (
              <div className="grid gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Secondary Phone</span>
                <p className="text-sm font-medium">{homeownerData.secondary_phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              Property Association
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location</span>
              {property ? (
                <Link 
                  href={`/dashboard/properties/${property.id}`}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Block {property.block}, Lot {property.lot}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground italic">No property linked</p>
              )}
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Move-in Date</span>
              <p className="text-sm font-medium">{homeownerData.move_in_date || 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name</span>
              <p className="text-sm font-medium">{homeownerData.emergency_contact_name || 'Not provided'}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</span>
              <p className="text-sm font-medium">{homeownerData.emergency_contact_phone || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Internal Notes</CardTitle>
            <CardDescription className="text-xs">Confidential staff-only observations</CardDescription>
          </CardHeader>
          <CardContent>
            {homeownerData.notes ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border italic">
                "{homeownerData.notes}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes added.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
