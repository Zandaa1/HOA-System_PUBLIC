
import { createClient } from '@/lib/supabase/server'
import { VehicleForm } from '@/components/forms/vehicle-form'

export default async function NewVehiclePage() {
  const supabase = await createClient()
  
  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Vehicle</h1>
        <p className="text-sm text-muted-foreground">
          Register a new resident vehicle for gate access
        </p>
      </div>

      <div className="max-w-4xl">
        <VehicleForm properties={(properties || []) as any} />
      </div>
    </div>
  )
}
