
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { redirect } from 'next/navigation'
import { AnnouncementForm } from '@/components/forms/announcement-form'

export default async function NewAnnouncementPage() {
  const supabase = await createClient()

  // Get current logged in staff author ID
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staff) {
    redirect('/portal')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <PageHeader
        title="Publish Announcement"
        description="Create a new notice or high-priority alert for the community"
      />

      <AnnouncementForm authorId={staff.id} />
    </div>
  )
}
