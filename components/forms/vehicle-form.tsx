'use client'

import { cn, getErrorMessage } from '@/lib/utils'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Vehicle, Property } from '@/lib/types/database'
import { Loader2 } from 'lucide-react'
import { FormGuide } from '@/components/form-guide'
import { PropertySelectGroup } from '@/components/property-selector'


interface VehicleFormProps {
  vehicle?: Vehicle
  properties: Property[]
}

export function VehicleForm({ vehicle, properties }: VehicleFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [residents, setResidents] = useState<{ id: string; name: string; type: 'homeowner' | 'renter' }[]>([])
  const [linkedInvoice, setLinkedInvoice] = useState<any>(null)

  const [formData, setFormData] = useState({
    property_id: vehicle?.property_id || '',
    owner_type: vehicle?.owner_type || 'homeowner',
    owner_id: vehicle?.owner_id || '',
    plate_number: vehicle?.plate_number || '',
    vehicle_type: vehicle?.vehicle_type || 'car',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    color: vehicle?.color || '',
    sticker_number: vehicle?.sticker_number || '',
    is_active: vehicle?.is_active ?? true,
  })

  const fetchResidents = async (propertyId: string) => {
    if (!propertyId) {
      setResidents([])
      return
    }

    const supabase = createClient()
    const [homeownersRes, rentersRes] = await Promise.all([
      supabase.from('homeowners').select('id, first_name, last_name').eq('property_id', propertyId),
      supabase.from('renters').select('id, first_name, last_name').eq('property_id', propertyId).eq('is_active', true),
    ])

    const combined: { id: string; name: string; type: 'homeowner' | 'renter' }[] = [
      ...(homeownersRes.data || []).map((h) => ({ id: h.id, name: `${h.first_name} ${h.last_name} (Owner)`, type: 'homeowner' as const })),
      ...(rentersRes.data || []).map((r) => ({ id: r.id, name: `${r.first_name} ${r.last_name} (Renter)`, type: 'renter' as const })),
    ]
    setResidents(combined)
  }

  // Fetch residents when property changes
  const handlePropertyChange = async (propertyId: string) => {
    setFormData((prev) => ({ ...prev, property_id: propertyId, owner_id: '' }))
    await fetchResidents(propertyId)
  }

  useEffect(() => {
    if (vehicle?.property_id) {
      fetchResidents(vehicle.property_id)
    }
  }, [vehicle?.property_id])

  useEffect(() => {
    const fetchLinkedInvoice = async () => {
      if (vehicle?.sticker_invoice_id) {
        const supabase = createClient()
        const { data } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, total_amount')
          .eq('id', vehicle.sticker_invoice_id)
          .single()
        setLinkedInvoice(data)
      }
    }
    fetchLinkedInvoice()
  }, [vehicle?.sticker_invoice_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const selectedResident = residents.find(r => r.id === formData.owner_id)

    try {
      let stickerInvoiceId: string | null = vehicle?.sticker_invoice_id || null

      // Always auto-generate sticker fee invoice when a sticker number is assigned
      if (formData.sticker_number && !vehicle?.sticker_invoice_id) {
        // 1. Fetch or create Car Sticker Fee type
        const { data: ft } = await supabase
          .from('fee_types')
          .select('id, default_amount')
          .eq('name', 'Car Sticker Fee')
          .eq('is_active', true)
          .maybeSingle()
        
        let feeTypeId = ft?.id
        let amount = ft?.default_amount || 500

        if (!feeTypeId) {
          const { data: newFt, error: ftErr } = await supabase
            .from('fee_types')
            .insert({
              name: 'Car Sticker Fee',
              description: 'Subdivision gate access vehicle sticker',
              default_amount: 500,
              recurrence: 'yearly',
              is_active: true
            })
            .select()
            .single()
          if (ftErr) throw ftErr
          feeTypeId = newFt.id
          amount = newFt.default_amount
        }

        // 2. Fetch system settings for invoice prefix and last invoice
        const [{ data: settings }, { data: lastInvoice }] = await Promise.all([
          supabase.from('system_settings').select('setting_value').eq('setting_key', 'invoice_prefix').single(),
          supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1).maybeSingle()
        ])

        const prefix = settings?.setting_value || 'INV'
        let nextNum = 1
        if (lastInvoice?.invoice_number) {
          const match = lastInvoice.invoice_number.match(/\d+$/)
          if (match) {
            nextNum = parseInt(match[0], 10) + 1
          }
        }
        const invNum = `${prefix}-${String(nextNum).padStart(6, '0')}`

        // 3. Create the invoice
        const { data: newInv, error: invErr } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invNum,
            property_id: formData.property_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subtotal: amount,
            discount_amount: 0,
            penalty_amount: 0,
            total_amount: amount,
            amount_paid: 0,
            balance: amount,
            status: 'pending',
            notes: `Auto-generated sticker invoice for vehicle: ${formData.color} ${formData.brand} ${formData.model} (Plate: ${formData.plate_number})`
          })
          .select()
          .single()
        
        if (invErr) throw invErr

        // 4. Create the invoice item
        const { error: itemErr } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: newInv.id,
            fee_type_id: feeTypeId,
            description: `Car Sticker Fee - Sticker #${formData.sticker_number}`,
            quantity: 1,
            unit_price: amount,
            amount: amount
          })
        if (itemErr) throw itemErr

        stickerInvoiceId = newInv.id
      }

      const data = {
        property_id: formData.property_id,
        owner_type: selectedResident?.type || formData.owner_type || null,
        owner_id: formData.owner_id || null,
        plate_number: formData.plate_number,
        vehicle_type: formData.vehicle_type as Vehicle['vehicle_type'],
        brand: formData.brand || null,
        model: formData.model || null,
        color: formData.color || null,
        sticker_number: formData.sticker_number || null,
        sticker_invoice_id: stickerInvoiceId,
        is_active: stickerInvoiceId ? false : formData.is_active,
      }

      if (vehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(data)
          .eq('id', vehicle.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehicles').insert(data)
        if (error) throw error
      }

      router.push('/dashboard/vehicles')
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
          <CardTitle className="text-base">Owner Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PropertySelectGroup
            properties={properties}
            value={formData.property_id}
            onValueChange={handlePropertyChange}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="owner_id">Resident Owner</Label>
            <Select
              value={formData.owner_id}
              onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
              disabled={!formData.property_id}
            >
              <SelectTrigger id="owner_id">
                <SelectValue placeholder="Select resident" />
              </SelectTrigger>
              <SelectContent>
                {residents.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="plate_number">Plate Number *</Label>
            <Input
              id="plate_number"
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
              placeholder="ABC 1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value as any })}
            >
              <SelectTrigger id="vehicle_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Toyota"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g. Vios"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sticker_number">Gate Sticker # *</Label>
            <Input
              id="sticker_number"
              value={formData.sticker_number}
              onChange={(e) => setFormData({ ...formData, sticker_number: e.target.value })}
              placeholder="e.g. 2026-0043"
              required={!vehicle}
            />
          </div>

          {vehicle?.sticker_invoice_id || linkedInvoice ? (
            <div className="col-span-full bg-muted/50 p-3 rounded-lg border text-xs space-y-2 max-w-md mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sticker Invoice:</span>
                <span className="font-semibold text-foreground">
                  {linkedInvoice?.invoice_number || 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Status:</span>
                <span className={cn(
                  "font-semibold capitalize",
                  linkedInvoice?.status === 'paid' ? "text-green-600" : "text-amber-600"
                )}>
                  {linkedInvoice?.status || 'Unknown'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Sticker activation is managed by invoice payment status.
              </p>
            </div>
          ) : !vehicle && (
            <p className="col-span-full text-xs text-muted-foreground pt-2">
              A sticker fee invoice (₱500) will be auto-generated.
            </p>
          )}

          <div className="col-span-full flex items-center space-x-2 pt-4 border-t mt-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              disabled
            />
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-muted-foreground">Active Sticker</Label>
              <p className="text-[10px] text-muted-foreground">
                Sticker active status is managed by the invoice payment trigger.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <FormGuide 
        notes={[
          "Plate numbers are used by gate guards for quick entry verification.",
          "Sticker numbers must match the physical sticker issued to the resident.",
          "Deactivate vehicles if a resident moves out or sells the car.",
          "Each property has a limited number of authorized resident vehicles."
        ]}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {vehicle ? 'Update Vehicle' : 'Register Vehicle'}
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
