
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Pencil, CarFront, MapPin, UserCog } from 'lucide-react'

const vehicleTypeLabels: Record<string, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  suv: 'SUV',
  van: 'Van',
  truck: 'Truck',
  other: 'Other',
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      *,
      property:properties(id, block, lot)
    `)
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  let linkedInvoice: any = null
  if (vehicle.sticker_invoice_id) {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount')
      .eq('id', vehicle.sticker_invoice_id)
      .maybeSingle()
    linkedInvoice = data
  }

  let owner: { first_name: string; last_name: string } | null = null
  if (vehicle.owner_type === 'homeowner') {
    const { data } = await supabase
      .from('homeowners')
      .select('id, first_name, last_name')
      .eq('id', vehicle.owner_id ?? '')
      .single()
    owner = data
  } else if (vehicle.owner_type === 'renter') {
    const { data } = await supabase
      .from('renters')
      .select('id, first_name, last_name')
      .eq('id', vehicle.owner_id ?? '')
      .single()
    owner = data
  }

  // Calculate dynamic sticker status text and style
  let statusText = 'Inactive'
  let statusBadgeVariant: 'secondary' | 'outline' | 'destructive' = 'outline'
  let statusClassName = 'text-muted-foreground'

  if (vehicle.is_active) {
    if (vehicle.sticker_expires_at) {
      const expiry = new Date(vehicle.sticker_expires_at)
      const now = new Date()
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 0) {
        statusText = `Expired (${expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })})`
        statusBadgeVariant = 'outline'
        statusClassName = 'text-red-700 bg-red-50 border-red-200'
      } else if (diffDays <= 30) {
        statusText = `Expiring Soon (${diffDays} days left)`
        statusBadgeVariant = 'outline'
        statusClassName = 'text-status-pending bg-status-pending-bg border-status-pending-border'
      } else {
        statusText = `Active (Expires ${expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })})`
        statusBadgeVariant = 'secondary'
        statusClassName = 'bg-status-paid-bg text-status-paid border-status-paid-border'
      }
    } else {
      statusText = 'Active'
      statusBadgeVariant = 'secondary'
      statusClassName = 'bg-status-paid-bg text-status-paid border-status-paid-border'
    }
  } else if (vehicle.sticker_invoice_id) {
    statusText = 'Unpaid Sticker'
    statusBadgeVariant = 'outline'
    statusClassName = 'text-status-pending bg-status-pending-bg/50 border-status-pending-border'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/vehicles">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{vehicle.plate_number}</h1>
            <p className="text-sm text-muted-foreground">Vehicle profile</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/vehicles/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit Vehicle
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Plate Number</span>
              <span className="font-medium font-mono">{vehicle.plate_number}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Type</span>
              <span>
                {vehicle.vehicle_type
                  ? vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Brand / Model</span>
              <span>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Color</span>
              <span>{vehicle.color || '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Sticker Number</span>
              <span>{vehicle.sticker_number || '—'}</span>
            </div>
            {vehicle.sticker_expires_at && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sticker Expires At</span>
                <span>{new Date(vehicle.sticker_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {linkedInvoice && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sticker Invoice</span>
                <Link href={`/dashboard/billing/invoices/${linkedInvoice.id}`} className="text-primary hover:underline font-semibold">
                  {linkedInvoice.invoice_number} (₱{linkedInvoice.total_amount.toLocaleString()})
                </Link>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusBadgeVariant} className={statusClassName}>
                {statusText}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              <span>Property</span>
            </div>
            <p className="font-medium">
              {vehicle.property ? `Block ${vehicle.property.block}, Lot ${vehicle.property.lot}` : '—'}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground pt-2">
              <UserCog className="size-4" />
              <span>Resident</span>
            </div>
            <p className="font-medium">
              {owner ? `${owner.first_name} ${owner.last_name}` : '—'}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground pt-2">
              <CarFront className="size-4" />
              <span>Owner Type</span>
            </div>
            <p className="font-medium capitalize">{vehicle.owner_type || '—'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
