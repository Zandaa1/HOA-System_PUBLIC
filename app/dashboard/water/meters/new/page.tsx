
import { createClient } from '@/lib/supabase/server'
import { WaterMeterForm } from '@/components/forms/water-meter-form'

export default async function NewMeterPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Water Meter</h1>
        <p className="text-sm text-muted-foreground">
          Register a new water meter to a property
        </p>
      </div>

      <WaterMeterForm properties={properties || []} />
    </div>
  )
}
