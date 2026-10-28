
import { createClient } from '@/lib/supabase/server'
import { WaterReadingForm } from '@/components/forms/water-reading-form'

export default async function NewReadingPage() {
  const supabase = await createClient()

  const { data: meters } = await supabase
    .from('water_meters')
    .select(`
      id, 
      meter_number, 
      last_reading_value,
      property:properties(block, lot)
    `)
    .order('meter_number')

  const formattedMeters = (meters || []).map((m: any) => ({
    id: m.id,
    meter_number: m.meter_number,
    last_reading_value: m.last_reading_value,
    property: Array.isArray(m.property) ? m.property[0] : m.property
  })).filter(m => m.property)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Record Reading</h1>
        <p className="text-sm text-muted-foreground">
          Log a new water meter reading
        </p>
      </div>

      <WaterReadingForm meters={formattedMeters as any} />
    </div>
  )
}
