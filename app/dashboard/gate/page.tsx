
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GateClient } from './gate-client'
import { PageHeader } from '@/components/ui/page-header'
import { requireModule } from '@/lib/check-module'

export default async function GateEntryPage() {
  await requireModule('enable_gate')
  const supabase = await createClient()

  // Fetch all vehicles with property and homeowner info for rapid search
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id,
      plate_number,
      vehicle_type,
      brand,
      model,
      color,
      is_active,
      property:properties(
        id, 
        block, 
        lot, 
        street_address,
        homeowners(first_name, last_name, phone)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Gate Security Hub"
        description="Real-time subdivision entry verification"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/vehicles/new">
              <Plus className="mr-2 size-4" />
              Register Vehicle
            </Link>
          </Button>
        }
      />

      <GateClient initialVehicles={vehicles || []} />
    </div>
  )
}
