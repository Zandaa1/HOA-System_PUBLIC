
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { VehiclesTable } from './vehicles-table'

export default async function VehiclesPage() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      property:properties(id, block, lot)
    `)
    .order('plate_number')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Vehicles"
        description="Manage registered vehicles"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/vehicles/new">
              <Plus className="mr-2 size-4" />
              Add Vehicle
            </Link>
          </Button>
        }
      />

      <VehiclesTable vehicles={vehicles || []} />
    </div>
  )
}
