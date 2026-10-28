
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
import { DeleteAmenityButton } from './delete-amenity-button'
import { getFileUrl } from '@/lib/storage/shared'

export default async function AmenityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: amenity }, { count: bookingCount }] = await Promise.all([
    supabase.from('amenities').select('*').eq('id', id).single(),
    supabase.from('amenity_bookings').select('*', { count: 'exact', head: true }).eq('amenity_id', id),
  ])

  if (!amenity) notFound()

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={amenity.name}
        description="Amenity profile"
        showBreadcrumb
        breadcrumbLabels={{ amenities: 'Amenities' }}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="icon-sm" className="size-9 shadow-sm" title="Back to List">
              <Link href="/dashboard/amenities">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href={`/dashboard/amenities/${id}/edit`}>
                <Pencil className="mr-2 size-4" />
                Edit Amenity
              </Link>
            </Button>
            <DeleteAmenityButton amenityId={id} photoUrl={amenity.photo_url} />
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3 px-6">
        {/* Photo Card */}
        <Card className="md:col-span-1 shadow-sm border-muted/60 overflow-hidden">
          <div className="relative h-64 bg-muted">
            {amenity.photo_url ? (
              <img
                src={getFileUrl(amenity.photo_url)}
                alt={amenity.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                <Pencil className="size-16" />
              </div>
            )}
          </div>
        </Card>

        <Card className="md:col-span-1 shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm font-medium">
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Status</span>
              <Badge variant={amenity.is_active ? 'secondary' : 'outline'} className={amenity.is_active ? "bg-green-50 text-green-700 border-green-200 font-bold" : ""}>
                {amenity.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Capacity</span>
              <span className="text-primary font-bold">{amenity.capacity ? `${amenity.capacity} pax` : '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Bookings</span>
              <span className="text-primary font-bold tabular-nums">{bookingCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Deposit</span>
              <span className="text-primary font-bold">{amenity.requires_deposit ? `₱${Number(amenity.deposit_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'Not required'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm font-medium">
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Hourly</span>
              <span className="text-primary font-bold">₱{Number(amenity.hourly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Half Day</span>
              <span className="text-primary font-bold">₱{Number(amenity.half_day_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-muted/40">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Full Day</span>
              <span className="text-primary font-bold">₱{Number(amenity.full_day_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col gap-1 py-2">
              <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Location</span>
              <span className="text-primary font-bold">{amenity.location || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 px-6">
        {amenity.description && (
          <Card className="shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-bold">Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              {amenity.description}
            </CardContent>
          </Card>
        )}

        {amenity.rules && (
          <Card className="shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle className="text-base font-bold">Rules & Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed italic">
              {amenity.rules}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
