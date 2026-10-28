'use client'

import { getErrorMessage } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'

interface MaintenanceRequestFormProps {
  propertyId: string
}

export function MaintenanceRequestForm({ propertyId }: MaintenanceRequestFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    let uploadedPath: string | null = null

    try {
      let photo_urls: string[] = []

      if (photoFile) {
        const uploaded = await uploadAppFile(photoFile, { directory: 'maintenance' })
        uploadedPath = uploaded.path
        photo_urls.push(uploaded.path)
      }

      const { error: insertError } = await supabase
        .from('maintenance_requests')
        .insert({
          property_id: propertyId,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: 'pending',
          photo_urls,
        })

      if (insertError) throw insertError

      router.push('/portal/maintenance')
      router.refresh()
    } catch (err) {
      await deleteAppFile(uploadedPath).catch(() => {})
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
            Request details
          </CardTitle>
          <CardDescription>Specify the maintenance problem in detail.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Issue Summary / Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Clogged main drainage pipe in driveway"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(val) => setFormData({ ...formData, category: val })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="carpentry">Carpentry / Building Repair</SelectItem>
                <SelectItem value="landscaping">Landscaping / Common Grounds</SelectItem>
                <SelectItem value="other">Other Operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Severity Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={(val) => setFormData({ ...formData, priority: val })}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Routine issues</SelectItem>
                <SelectItem value="medium">Medium - Standard repair</SelectItem>
                <SelectItem value="high">High - Urgent concern</SelectItem>
                <SelectItem value="emergency">Emergency - Action required immediately</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Please explain the issue. Mention specific locations, leak sizes, or hazard concerns..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="photo">Attach Photo Evidence (Optional)</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/portal/maintenance')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Work Order
        </Button>
      </div>
    </form>
  )
}
