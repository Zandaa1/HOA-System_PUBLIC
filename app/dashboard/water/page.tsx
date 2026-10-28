
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { WaterMetersTable } from './water-meters-table'
import { WaterReadingsTable } from './water-readings-table'
import { requireModule } from '@/lib/check-module'

export default async function WaterMeteringPage() {
  await requireModule('enable_water_billing')

  const supabase = await createClient()
  const [{ data: meters }, { data: readings }] = await Promise.all([
    supabase
      .from('water_meters')
      .select(`
        id,
        meter_number,
        installation_date,
        last_reading_date,
        last_reading_value,
        is_active,
        property:properties(id, block, lot)
      `)
      .order('meter_number'),
    supabase
      .from('water_readings')
      .select(`
        id,
        reading_date,
        previous_reading,
        current_reading,
        consumption,
        meter:water_meters(
          meter_number,
          property:properties(block, lot)
        )
      `)
      .order('reading_date', { ascending: false })
      .limit(200),
  ])

  const formattedMeters = (meters || []).map((m: any) => ({
    ...m,
    property: Array.isArray(m.property) ? m.property[0] : m.property
  })) as any

  const formattedReadings = (readings || []).map((r: any) => {
    const rawMeter = Array.isArray(r.meter) ? r.meter[0] : r.meter
    return {
      ...r,
      meter: rawMeter ? {
        ...rawMeter,
        property: Array.isArray(rawMeter.property) ? rawMeter.property[0] : rawMeter.property
      } : null
    }
  }) as any

  const activeMetersCount = formattedMeters.filter((meter: any) => meter.is_active).length || 0
  const totalConsumption =
    formattedReadings.reduce((sum: number, reading: any) => sum + Number(reading.consumption || 0), 0) || 0

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Water Metering</h1>
          <p className="text-sm text-muted-foreground">
            Manage water meters and record consumption readings
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild size="sm" variant="outline" className="h-9 px-4">
            <Link href="/dashboard/water/readings/batch">
              <Plus className="mr-2 size-4" />
              Batch Readings
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 px-4">
            <Link href="/dashboard/water/readings/new">
              <Plus className="mr-2 size-4" />
              Single Reading
            </Link>
          </Button>
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/water/meters/new">
              <Plus className="mr-2 size-4" />
              Add Meter
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Meters</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-primary">
            {meters?.length || 0}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Meters</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-green-600">
            {activeMetersCount}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Consumption</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-primary">
            {totalConsumption.toLocaleString()} <span className="text-muted-foreground font-normal text-xl">m³</span>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Water Meters</h2>
        <WaterMetersTable meters={formattedMeters} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Recent Readings</h2>
        <WaterReadingsTable readings={formattedReadings} />
      </div>
    </div>
  )
}
