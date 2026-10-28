
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { notFound, redirect } from 'next/navigation'
import { AnnouncementForm } from '@/components/forms/announcement-form'

interface EditAnnouncementPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditAnnouncementPage({ params }: EditAnnouncementPageProps) {
  const supabase = await createClient()

  // Get parameters
  const { id } = await params

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

  // Fetch the announcement
  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!announcement) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <PageHeader
        title="Edit Announcement"
        description="Update an existing notice or alert details"
      />

      <AnnouncementForm announcement={announcement} authorId={staff.id} />
    </div>
  )
}
