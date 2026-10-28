'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils'

interface AnnouncementFormProps {
  announcement?: {
    id: string
    title: string
    content: string
    is_pinned: boolean
    is_alert: boolean
  }
  authorId: string
}

export function AnnouncementForm({ announcement, authorId }: AnnouncementFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    is_pinned: announcement?.is_pinned || false,
    is_alert: announcement?.is_alert || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const data = {
        title: formData.title,
        content: formData.content,
        is_pinned: formData.is_pinned,
        is_alert: formData.is_alert,
        author_id: authorId,
        updated_at: new Date().toISOString(),
      }

      if (announcement) {
        const { error } = await supabase
          .from('announcements')
          .update(data)
          .eq('id', announcement.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert({
            ...data,
            created_at: new Date().toISOString(),
          })
        if (error) throw error
      }

      router.push('/dashboard/announcements')
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
          <CardTitle className="text-base">
            {announcement ? 'Edit Announcement' : 'New Announcement'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g. Scheduled Power Interruption"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={6}
              placeholder="Provide details about the announcement..."
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8 pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="is_pinned">Pin Announcement</Label>
                <p className="text-xs text-muted-foreground font-normal">
                  Keep this announcement at the top of the feed.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_alert"
                checked={formData.is_alert}
                onCheckedChange={(checked) => setFormData({ ...formData, is_alert: checked })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="is_alert">Important Alert Banner</Label>
                <p className="text-xs text-muted-foreground font-normal">
                  Display as a high-visibility alert banner on the portal home.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {announcement ? 'Update Announcement' : 'Publish Announcement'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
