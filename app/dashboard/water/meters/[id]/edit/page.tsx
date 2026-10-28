
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WaterMeterForm } from '@/components/forms/water-meter-form'

export default async function EditWaterMeterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: meter }, { data: properties }] = await Promise.all([
    supabase.from('water_meters').select('*').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!meter) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Water Meter</h1>
        <p className="text-sm text-muted-foreground">
          Update meter {meter.meter_number}
        </p>
      </div>

      <WaterMeterForm meter={meter} properties={properties || []} />
    </div>
  )
}
