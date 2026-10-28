
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { HomeownerForm } from '@/components/forms/homeowner-form'

export default async function EditHomeownerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: homeowner }, { data: properties }] = await Promise.all([
    supabase.from('homeowners').select('*').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!homeowner) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Homeowner</h1>
        <p className="text-sm text-muted-foreground">
          Update information for {homeowner.first_name} {homeowner.last_name}
        </p>
      </div>

      <HomeownerForm homeowner={homeowner} properties={(properties || []) as any} />
    </div>
  )
}
