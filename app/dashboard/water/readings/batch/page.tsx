
import { createClient } from '@/lib/supabase/server'
import { BatchWaterReadingForm } from '@/components/forms/batch-water-reading-form'

export default async function BatchReadingPage() {
  const supabase = await createClient()

  const { data: meters } = await supabase
    .from('water_meters')
    .select(`
      id, 
      meter_number, 
      last_reading_value,
      property:properties(block, lot)
    `)
    .eq('is_active', true)
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
        <h1 className="text-2xl font-semibold tracking-tight">Batch Record Readings</h1>
        <p className="text-sm text-muted-foreground">
          Log new water meter readings for all active meters simultaneously
        </p>
      </div>

      <BatchWaterReadingForm meters={formattedMeters as any} />
    </div>
  )
}
