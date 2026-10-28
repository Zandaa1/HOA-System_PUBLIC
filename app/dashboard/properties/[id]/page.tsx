
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Pencil, User, Car, Receipt, MapPin } from 'lucide-react'
import { SimpleMap } from '@/components/simple-map'
import { StatusBadge } from '@/components/ui/status-badge'
import { getOptimizedStorageUrl } from '@/lib/utils'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select(`
      *,
      property_type:property_types(*),
      homeowners(*),
      renters(*),
      vehicles(*)
    `)
    .eq('id', id)
    .single()

  if (!property) {
    notFound()
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('property_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/properties" className="hover:text-primary transition-colors">
              Properties
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              Block {property.block}, Lot {property.lot}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Block {property.block}, Lot {property.lot}
            </h1>
            <StatusBadge type="property" status={property.status} />
            {property.is_rented && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                Rented Out
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {property.street_address || 'No address specified'}
            {property.phase && ` • Phase ${property.phase}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/properties/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Property Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {property.property_type?.name || 'Not specified'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lot Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {property.lot_area_sqm ? `${property.lot_area_sqm} sqm` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Floor Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {property.floor_area_sqm ? `${property.floor_area_sqm} sqm` : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              ₱{(property.monthly_dues_override || property.property_type?.default_monthly_dues || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {property.photo_url && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Exterior Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={getOptimizedStorageUrl(property.photo_url, { width: 800, height: 400, resize: 'cover' })}
              alt={`Exterior of Block ${property.block} Lot ${property.lot}`}
              className="h-72 w-full rounded-md border object-cover"
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="residents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="residents" className="gap-2">
            <User className="size-4" />
            Residents
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-2">
            <Car className="size-4" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <Receipt className="size-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="location" className="gap-2">
            <MapPin className="size-4" />
            Location
          </TabsTrigger>
        </TabsList>

        <TabsContent value="residents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Homeowners</CardTitle>
                    <CardDescription>Property owners on record</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/residents/homeowners/new?property_id=${id}`}>
                      Add Homeowner
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {property.homeowners?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No homeowners registered</p>
                ) : (
                  <div className="space-y-2">
                    {property.homeowners?.map((owner: { id: string; first_name: string; last_name: string; email?: string; phone?: string; is_residing: boolean }) => (
                      <div
                        key={owner.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {owner.first_name} {owner.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {owner.email || owner.phone || 'No contact info'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {owner.is_residing && (
                            <Badge variant="outline">Residing</Badge>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/residents/homeowners/${owner.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div>
                  <CardTitle className="text-base">Renters</CardTitle>
                  <CardDescription>Renter records self-reported via the resident portal</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {!property.renters || property.renters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No renters registered</p>
                ) : (
                  <div className="space-y-2">
                    {property.renters.map((renter: { id: string; first_name: string; last_name: string; email?: string; phone?: string; is_active: boolean; lease_start?: string; lease_end?: string }) => (
                      <div
                        key={renter.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {renter.first_name} {renter.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {renter.email || renter.phone || 'No contact info'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {renter.is_active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] font-bold uppercase tracking-widest">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">
                              Closed
                            </Badge>
                          )}
                          {renter.lease_start && renter.lease_end && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Lease: {new Date(renter.lease_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(renter.lease_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Registered Vehicles</CardTitle>
                  <CardDescription>Vehicles associated with this property</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/vehicles/new?property_id=${id}`}>
                    Add Vehicle
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {property.vehicles?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vehicles registered</p>
              ) : (
                <div className="space-y-2">
                  {property.vehicles?.map((vehicle: { id: string; plate_number: string; vehicle_type?: string; brand?: string; model?: string; color?: string; is_active: boolean }) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{vehicle.plate_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {[vehicle.color, vehicle.brand, vehicle.model, vehicle.vehicle_type]
                            .filter(Boolean)
                            .join(' ') || 'No details'}
                        </p>
                      </div>
                      <Badge variant={vehicle.is_active ? 'default' : 'secondary'}>
                        {vehicle.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Invoices</CardTitle>
                  <CardDescription>Billing history for this property</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/billing/invoices?property_id=${id}`}>
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!invoices || invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices found</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {invoice.due_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        <StatusBadge type="invoice" status={invoice.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Location</CardTitle>
              <CardDescription>
                {property.latitude && property.longitude
                  ? `Coordinates: ${property.latitude}, ${property.longitude}`
                  : 'No coordinates set for this property'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {property.latitude && property.longitude ? (
                <SimpleMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  markerLabel={`Block ${property.block}, Lot ${property.lot}`}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Set coordinates in the property settings to display the map location.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {property.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{property.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
