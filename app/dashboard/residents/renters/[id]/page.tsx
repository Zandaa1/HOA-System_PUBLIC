
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Phone, MapPin, ArrowLeft, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

interface RenterPageProps {
  params: Promise<{ id: string }>
}

export default async function RenterDetailPage({ params }: RenterPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: renter } = await supabase
    .from('renters')
    .select(`
      *,
      property:properties(*)
    `)
    .eq('id', id)
    .single()

  if (!renter) {
    notFound()
  }

  const property = renter.property

  const fmt = (n: number | null) =>
    n != null ? `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'N/A'

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${renter.first_name} ${renter.middle_name ? `${renter.middle_name} ` : ''}${renter.last_name}`}
        description="Renter Profile"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon-sm" className="size-9 shadow-sm" title="Back to List">
              <Link href="/dashboard/residents/renters">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href={`/dashboard/residents/renters/${id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit Profile
              </Link>
            </Button>
          </div>
        }
      >
        <Badge variant="secondary" className={cn(
          "font-bold text-[10px] uppercase border",
          renter.is_active
            ? "bg-status-paid-bg text-status-paid border-status-paid-border"
            : "bg-status-inactive-bg text-status-inactive border-status-inactive-border"
        )}>
          {renter.is_active ? 'Active Lease' : 'Inactive'}
        </Badge>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3 px-6">
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
              <p className="text-sm font-medium">{renter.email || 'None'}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</span>
              <p className="text-sm font-medium">{renter.phone || 'None'}</p>
            </div>
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              Lease Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lease Period</span>
              <p className="text-sm font-medium">
                {renter.lease_start || 'Unknown'} — {renter.lease_end || 'Open-ended'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {renter.notes ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border italic">
                &ldquo;{renter.notes}&rdquo;
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
