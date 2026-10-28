'use client'

import { getErrorMessage } from '@/lib/utils'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SystemSetting } from '@/lib/types/database'
import { Loader2, Save, Phone, Shield, Wrench, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface ContactsFormProps {
  settings: SystemSetting[]
}

const contactFields = [
  {
    key: 'contact_phone',
    label: 'HOA Office Phone',
    description: 'Main office contact number displayed to residents',
    icon: Building2,
    placeholder: 'Not configured',
  },
  {
    key: 'contact_email',
    label: 'HOA Office Email',
    description: 'Official email address for inquiries and billing',
    icon: Building2,
    placeholder: 'admin@example.invalid',
  },
  {
    key: 'contact_emergency',
    label: 'Emergency Hotline',
    description: 'For emergencies requiring immediate assistance',
    icon: Phone,
    placeholder: 'Not configured',
  },
  {
    key: 'contact_security',
    label: 'Security / Gate',
    description: 'Gate access, security concerns, visitor inquiries',
    icon: Shield,
    placeholder: 'Not configured',
  },
  {
    key: 'contact_maintenance',
    label: 'Maintenance',
    description: 'Report subdivision maintenance issues',
    icon: Wrench,
    placeholder: 'Not configured',
  },
]

export function ContactsForm({ settings }: ContactsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>(
    settings.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value || '' }), {})
  )

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    try {
      const updates = contactFields.map(({ key }) => ({
        setting_key: key,
        setting_value: formData[key] || '',
      }))

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' })

      if (error) throw error

      toast.success('Contacts updated successfully')
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Directory Contacts</CardTitle>
          <CardDescription>
            These contacts are displayed to residents in the portal directory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {contactFields.map(({ key, label, description, icon: Icon, placeholder }) => (
            <div key={key} className="grid gap-2">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                <Label htmlFor={key}>{label}</Label>
              </div>
              <p className="text-xs text-muted-foreground/80 -mt-1.5 mb-1">{description}</p>
              <Input
                id={key}
                value={formData[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                className="max-w-md"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save Contacts
        </Button>
      </div>
    </form>
  )
}
