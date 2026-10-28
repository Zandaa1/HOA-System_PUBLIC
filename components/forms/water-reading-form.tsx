'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertTriangle } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { sendLeakWarningEmail } from '@/lib/actions/send-leak-warning-email'

interface WaterReadingFormProps {
  meters: { id: string; meter_number: string; last_reading_value: number; property: { block: string; lot: string } }[]
  reading?: any
}

export function WaterReadingForm({ meters, reading }: WaterReadingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    meter_id: reading?.meter_id || '',
    reading_date: reading?.reading_date || new Date().toISOString().split('T')[0],
    previous_reading: reading?.previous_reading?.toString() || '0',
    current_reading: reading?.current_reading?.toString() || '',
    notes: reading?.notes || '',
  })

  const [averageConsumption, setAverageConsumption] = useState<number | null>(null)
  const [fetchingAvg, setFetchingAvg] = useState(false)

  useEffect(() => {
    if (!formData.meter_id) {
      setAverageConsumption(null)
      return
    }

    const fetchAverage = async () => {
      setFetchingAvg(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('water_readings')
        .select('consumption')
        .eq('meter_id', formData.meter_id)
        .order('reading_date', { ascending: false })
        .limit(3)

      if (data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.consumption, 0)
        const avg = sum / data.length
        setAverageConsumption(avg)
      } else {
        setAverageConsumption(null)
      }
      setFetchingAvg(false)
    }

    fetchAverage()
  }, [formData.meter_id])

  // Sort blocks numerically if possible, otherwise alphabetically
  const uniqueBlocks = Array.from(new Set(meters.map((m) => m.property.block))).sort((a, b) => {
    const numA = parseInt(a, 10)
    const numB = parseInt(b, 10)
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }
    return a.localeCompare(b)
  })

  // Find currently selected meter
  const selectedMeter = meters.find((m) => m.id === formData.meter_id)
  const isInternalChange = useRef(false)
  const [localBlock, setLocalBlock] = useState('')
  const [prevMeterId, setPrevMeterId] = useState(formData.meter_id)

  if (formData.meter_id !== prevMeterId) {
    setPrevMeterId(formData.meter_id)
    if (!isInternalChange.current) {
      const meter = meters.find((m) => m.id === formData.meter_id)
      setLocalBlock(meter ? meter.property.block : '')
    }
    isInternalChange.current = false
  }

  const currentBlock = selectedMeter ? selectedMeter.property.block : localBlock

  // Filter meters in current block
  const metersInBlock = currentBlock
    ? meters
        .filter((m) => m.property.block === currentBlock)
        .sort((a, b) => {
          const numA = parseInt(a.property.lot, 10)
          const numB = parseInt(b.property.lot, 10)
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB
          }
          return a.property.lot.localeCompare(b.property.lot)
        })
    : []

  const handleBlockChange = (block: string) => {
    isInternalChange.current = true
    setLocalBlock(block)
    setFormData((prev) => ({
      ...prev,
      meter_id: '',
      previous_reading: '0',
    }))
  }

  const handleMeterChange = (value: string) => {
    isInternalChange.current = true
    const meter = meters.find(m => m.id === value)
    setFormData({
      ...formData,
      meter_id: value,
      previous_reading: meter?.last_reading_value.toString() || '0'
    })
  }

  const prev = parseFloat(formData.previous_reading)
  const curr = parseFloat(formData.current_reading)
  const consumption = Math.max(0, curr - prev)
  const showAnomalyWarning =
    averageConsumption !== null &&
    averageConsumption > 0 &&
    consumption > averageConsumption * 1.5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const data = {
      meter_id: formData.meter_id,
      reading_date: formData.reading_date,
      previous_reading: prev,
      current_reading: curr,
      consumption,
      notes: formData.notes || null,
    }

    try {
      if (reading) {
        const { error } = await supabase.from('water_readings').update(data).eq('id', reading.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('water_readings').insert(data)
        if (error) throw error

        // Update the meter's last reading value only on new reading
        await supabase
          .from('water_meters')
          .update({ last_reading_value: curr, last_reading_date: formData.reading_date })
          .eq('id', formData.meter_id)

        // Trigger leak warning email asynchronously if consumption is an anomaly
        if (showAnomalyWarning) {
          const percentIncrease = ((consumption - averageConsumption!) / averageConsumption!) * 100
          sendLeakWarningEmail(
            formData.meter_id,
            formData.reading_date,
            consumption,
            averageConsumption!,
            percentIncrease
          ).catch((err) => console.error('Failed to trigger leak warning email:', err))
        }
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
          <CardTitle className="text-base font-semibold">Record Reading</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="property_block">Block *</Label>
            <Select
              value={currentBlock}
              onValueChange={handleBlockChange}
              required
            >
              <SelectTrigger id="property_block">
                <SelectValue placeholder="Select block" />
              </SelectTrigger>
              <SelectContent>
                {uniqueBlocks.map((block) => (
                  <SelectItem key={block} value={block}>
                    Block {block}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meter_id">Lot *</Label>
            <Select
              value={formData.meter_id}
              onValueChange={handleMeterChange}
              disabled={!currentBlock}
              required
            >
              <SelectTrigger id="meter_id">
                <SelectValue placeholder={currentBlock ? 'Select lot' : 'Select block first'} />
              </SelectTrigger>
              <SelectContent>
                {metersInBlock.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    Lot {m.property.lot} ({m.meter_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading_date">Reading Date *</Label>
            <Input
              id="reading_date"
              type="date"
              value={formData.reading_date}
              onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="previous_reading">Previous Reading (m³)</Label>
            <Input
              id="previous_reading"
              type="number"
              value={formData.previous_reading}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_reading">Current Reading (m³) *</Label>
            <Input
              id="current_reading"
              type="number"
              step="0.01"
              value={formData.current_reading}
              onChange={(e) => setFormData({ ...formData, current_reading: e.target.value })}
              required
              placeholder="Enter current meter reading"
            />
          </div>

          <div className="space-y-2">
            <Label>Estimated Consumption</Label>
            <div className="text-lg font-medium pt-2">
              {consumption.toFixed(2)} m³
            </div>
          </div>

          {showAnomalyWarning && (
            <div className="sm:col-span-2">
              <Alert variant="warning">
                <AlertTriangle className="size-4" />
                <AlertTitle>High Water Consumption Alert</AlertTitle>
                <AlertDescription>
                  Estimated consumption of <strong>{consumption.toFixed(2)} m³</strong> is <strong>{((consumption - averageConsumption!) / averageConsumption! * 100).toFixed(0)}%</strong> above the 3-month average of <strong>{averageConsumption?.toFixed(2)} m³</strong>. Please check for input errors or leaks.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Remarks (e.g., meter seal broken)"
            />
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Meter readings should be taken at regular monthly intervals.",
          "Consumption is automatically calculated as the difference between current and previous readings.",
          "Ensure the current reading is not lower than the previous reading.",
          "Record any issues like broken seals or leaks in the notes section."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Record Reading
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
