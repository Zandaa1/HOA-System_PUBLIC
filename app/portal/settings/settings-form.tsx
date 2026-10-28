'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface SettingsFormProps {
  initialData: {
    hide_email: boolean
    hide_phone: boolean
    is_rented?: boolean
  }
  residentId: string
  residentType: 'homeowner' | 'renter'
  propertyId?: string
}

export function SettingsForm({ initialData, residentId, residentType, propertyId }: SettingsFormProps) {
  const [hideEmail, setHideEmail] = useState(initialData.hide_email)
  const [hidePhone, setHidePhone] = useState(initialData.hide_phone)
  const [isRented, setIsRented] = useState(initialData.is_rented ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from(residentType === 'homeowner' ? 'homeowners' : 'renters')
        .update({
          hide_email: hideEmail,
          hide_phone: hidePhone,
        })
        .eq('id', residentId)

      if (error) throw error

      if (residentType === 'homeowner' && propertyId) {
        const { error: rpcError } = await supabase.rpc('update_property_rented', {
          prop_id: propertyId,
          rented: isRented,
        })
        if (rpcError) throw rpcError
      }

      toast.success('Settings updated successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Hide Email</Label>
            <p className="text-sm text-muted-foreground">
              Your email address will not be visible in the directory.
            </p>
          </div>
          <Switch
            checked={hideEmail}
            onCheckedChange={setHideEmail}
          />
        </div>
        
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Hide Phone Number</Label>
            <p className="text-sm text-muted-foreground">
              Your phone number will not be visible in the directory.
            </p>
          </div>
          <Switch
            checked={hidePhone}
            onCheckedChange={setHidePhone}
          />
        </div>

        {residentType === 'homeowner' && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Renting Out Property</Label>
              <p className="text-sm text-muted-foreground">
                Enable this option if your property is currently rented out.
              </p>
            </div>
            <Switch
              checked={isRented}
              onCheckedChange={setIsRented}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  )
}
