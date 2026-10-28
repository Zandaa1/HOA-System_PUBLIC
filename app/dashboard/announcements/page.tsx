
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { AnnouncementsTable } from './announcements-table'

export default async function AnnouncementsPage() {
  const supabase = await createClient()

  // Fetch announcements ordered by pinned first, then newest
  const { data: announcements } = await supabase
    .from('announcements')
    .select(`
      id,
      title,
      content,
      is_pinned,
      is_alert,
      created_at,
      author:staff(first_name, last_name)
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Community Announcements"
        description="Publish and manage notices and alerts for residents"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/announcements/new">
              <Plus className="mr-2 size-4" />
              New Announcement
            </Link>
          </Button>
        }
      />

      <AnnouncementsTable announcements={(announcements as any) || []} />
    </div>
  )
}
