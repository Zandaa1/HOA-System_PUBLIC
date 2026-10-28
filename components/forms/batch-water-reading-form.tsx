'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface BatchWaterReadingFormProps {
  meters: { id: string; meter_number: string; last_reading_value: number; property: { block: string; lot: string } }[]
}

export function BatchWaterReadingForm({ meters }: BatchWaterReadingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0])
  
  // State for the readings keyed by meter ID
  const [readings, setReadings] = useState<Record<string, string>>({})

  const handleReadingChange = (meterId: string, value: string) => {
    setReadings(prev => ({ ...prev, [meterId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Prepare data to insert
    const dataToInsert = []
    const metersToUpdate = []

    for (const meter of meters) {
      const currentReadingStr = readings[meter.id]
      if (currentReadingStr && currentReadingStr.trim() !== '') {
        const prev = meter.last_reading_value
        const curr = parseFloat(currentReadingStr)
        const consumption = Math.max(0, curr - prev)

        dataToInsert.push({
          meter_id: meter.id,
          reading_date: readingDate,
          previous_reading: prev,
          current_reading: curr,
          consumption,
        })

        metersToUpdate.push({
          id: meter.id,
          last_reading_value: curr,
          last_reading_date: readingDate
        })
      }
    }

    if (dataToInsert.length === 0) {
      setError('Please enter at least one new reading.')
      setIsLoading(false)
      return
    }

    try {
      const { error: insertError } = await supabase.from('water_readings').insert(dataToInsert)
      if (insertError) throw insertError

      // Update meters
      for (const meterUpdate of metersToUpdate) {
         await supabase
          .from('water_meters')
          .update({ last_reading_value: meterUpdate.last_reading_value, last_reading_date: meterUpdate.last_reading_date })
          .eq('id', meterUpdate.id)
      }

      router.push('/dashboard/water')
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Global Reading Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="reading_date">Reading Date</Label>
            <Input
              id="reading_date"
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Meter Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Meter #</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium text-right w-32">Previous (m³)</th>
                  <th className="px-4 py-3 font-medium w-48">Current (m³)</th>
                  <th className="px-4 py-3 font-medium text-right w-32">Consumption</th>
                </tr>
              </thead>
              <tbody>
                {meters.map(meter => {
                  const currentInput = readings[meter.id] || ''
                  const currentVal = parseFloat(currentInput)
                  const consumption = !isNaN(currentVal) ? Math.max(0, currentVal - meter.last_reading_value).toFixed(2) : '-'

                  return (
                    <tr key={meter.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{meter.meter_number}</td>
                      <td className="px-4 py-3">Blk {meter.property.block} Lot {meter.property.lot}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{meter.last_reading_value.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={currentInput}
                          onChange={(e) => handleReadingChange(meter.id, e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary">{consumption}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Submit Batch Readings
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
