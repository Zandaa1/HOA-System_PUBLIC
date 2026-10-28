
import { createClient } from '@/lib/supabase/server'
import { PropertiesTable } from './properties-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'

export default async function PropertiesPage() {
  const supabase = await createClient()
  
  const { data: properties } = await supabase
    .from('properties')
    .select(`
      *,
      property_type:property_types(*),
      homeowners(id, first_name, last_name),
      vehicles(id, plate_number, is_active)
    `)
    .order('block')
    .order('lot')

  const { data: propertyTypes } = await supabase
    .from('property_types')
    .select('*')
    .order('name')

  const allProperties = properties || []
  const occupied = allProperties.filter((p) => p.status === 'occupied').length
  const totalResidents = allProperties.reduce(
    (sum, p) =>
      sum +
      (p.homeowners?.length || 0),
    0
  )
  const totalActiveVehicles = allProperties.reduce(
    (sum, p) => sum + (p.vehicles?.filter((v: any) => v.is_active).length || 0),
    0
  )

  return (
    <div className="space-y-6 pb-6">
      <PageHeader
        title="Properties"
        description="Manage all properties in the subdivision"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/properties/new">
              <Plus className="mr-2 size-4" />
              Add Property
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Total Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6">
            {allProperties.length}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Active Residents
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6">
            {totalResidents}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Occupied / Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6">
            {occupied} <span className="text-muted-foreground font-normal text-xl">/</span> {totalActiveVehicles}
          </CardContent>
        </Card>
      </div>

      <PropertiesTable 
        properties={allProperties}
        propertyTypes={propertyTypes || []}
      />
    </div>
  )
}
