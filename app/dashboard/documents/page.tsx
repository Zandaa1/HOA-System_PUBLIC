
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { DocumentsManager } from './documents-manager'
import { requireModule } from '@/lib/check-module'

export default async function DocumentsPage() {
  await requireModule('enable_documents')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Load current staff member ID
  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const staffId = staff?.id

  // Fetch all documents metadata from database, including uploader details
  const { data: documents } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      description,
      file_path,
      file_size,
      created_at,
      uploaded_by,
      uploader:staff(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Document Manager"
        description="Upload and manage forms, guidelines, and community documents for residents to access."
      />

      <DocumentsManager
        initialDocuments={(documents as any) || []}
        staffId={staffId}
      />
    </div>
  )
}
