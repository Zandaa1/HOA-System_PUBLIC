
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VehicleForm } from '@/components/forms/vehicle-form'

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: vehicle }, { data: properties }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!vehicle) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Vehicle</h1>
        <p className="text-sm text-muted-foreground">
          Update vehicle {vehicle.plate_number}
        </p>
      </div>

      <div className="max-w-4xl">
        <VehicleForm vehicle={vehicle} properties={(properties || []) as any} />
      </div>
    </div>
  )
}
