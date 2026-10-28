'use client'

import { getErrorMessage } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'
import { getFileUrl } from '@/lib/storage/shared'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Violation, ViolationCategory, Property } from '@/lib/types/database'
import { Loader2, Upload } from 'lucide-react'
import { PropertySelectGroup } from '@/components/property-selector'

interface ViolationFormProps {
  violation?: Violation
  categories: ViolationCategory[]
  properties: Property[]
}

export function ViolationForm({ violation, categories, properties }: ViolationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotos, setExistingPhotos] = useState<string[]>(violation?.photo_urls || [])

  const [formData, setFormData] = useState({
    property_id: violation?.property_id || '',
    category_id: violation?.category_id || '',
    title: violation?.title || '',
    description: violation?.description || '',
    status: violation?.status || 'warning_issued',
    incident_date: violation?.incident_date || new Date().toISOString().split('T')[0],
    fine_applied: violation?.fine_applied?.toString() || '0',
    notes: violation?.notes || '',
  })

  const handleCategoryChange = (value: string) => {
    const category = categories.find((c) => c.id === value)
    setFormData((prev) => ({
      ...prev,
      category_id: value,
      fine_applied: category ? category.fine_amount.toString() : '0',
      title: category ? category.name : prev.title,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    let uploadedPath: string | null = null

    try {
      let uploadedUrls = [...existingPhotos]

      if (photoFile) {
        const uploaded = await uploadAppFile(photoFile, { directory: 'violations' })
        uploadedPath = uploaded.path
        uploadedUrls.push(uploaded.path)
      }

      const data = {
        property_id: formData.property_id,
        category_id: formData.category_id || null,
        title: formData.title,
        description: formData.description || null,
        status: formData.status as any,
        incident_date: formData.incident_date,
        photo_urls: uploadedUrls,
        fine_applied: formData.fine_applied ? parseFloat(formData.fine_applied) : 0,
        notes: formData.notes || null,
      }

      let violationId = violation?.id

      if (violation) {
        const { error: updateError } = await supabase
          .from('violations')
          .update(data)
          .eq('id', violation.id)

        if (updateError) throw updateError

        // Log manual edit/update action for audit trail
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          await supabase.from('violation_logs').insert({
            violation_id: violation.id,
            action: 'Violation Updated',
            performed_by: userData.user.id,
            details: `Violation details updated. Status: ${formData.status}. Fine: ₱${data.fine_applied}.`,
          })
        }
      } else {
        const { data: newViolation, error: insertError } = await supabase
          .from('violations')
          .insert(data)
          .select()
          .single()

        if (insertError) throw insertError
        violationId = newViolation.id

        // Log creation action for audit trail
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          await supabase.from('violation_logs').insert({
            violation_id: violationId,
            action: 'Violation Created',
            performed_by: userData.user.id,
            details: `Initial violation logged. Status: ${formData.status}. Fine: ₱${data.fine_applied}.`,
          })
        }
      }

      router.push('/dashboard/violations')
      router.refresh()
    } catch (err) {
      await deleteAppFile(uploadedPath).catch(() => {})
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Violation Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <PropertySelectGroup
                properties={properties}
                value={formData.property_id}
                onValueChange={(val) => setFormData({ ...formData, property_id: val })}
                disabled={!!violation}
                required
                blockLabel="Target Block"
                lotLabel="Target Lot"
              />

              <div className="space-y-2">
                <Label htmlFor="category_id">Violation Category</Label>
                <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (Guideline Fine: ₱{c.fine_amount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Violation Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Unresolved construction debris on sidewalk"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Violation Details / Remarks</Label>
                <Textarea
                  id="description"
                  placeholder="Specify violation context, specific dates, or resident communication details..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Action & Fines
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status">Current Action Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as 'cancelled' | 'warning_issued' | 'fine_issued' | 'resolved' | 'appealed' })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning_issued">Warning Issued</SelectItem>
                    <SelectItem value="fine_issued">Fine Issued</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="appealed">Appealed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fine_applied">Discretionary Fine (₱)</Label>
                <Input
                  id="fine_applied"
                  type="number"
                  step="0.01"
                  value={formData.fine_applied}
                  onChange={(e) => setFormData({ ...formData, fine_applied: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident_date">Incident Date</Label>
                <Input
                  id="incident_date"
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Incident Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingPhotos.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {existingPhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={getFileUrl(url)}
                      alt="Incident Documentation"
                      className="h-40 w-full rounded-md border object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo Evidence</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                placeholder="Private staff-only logs regarding communications or inspections..."
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/violations')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {violation ? 'Save Changes' : 'Log Violation'}
        </Button>
      </div>
    </form>
  )
}
