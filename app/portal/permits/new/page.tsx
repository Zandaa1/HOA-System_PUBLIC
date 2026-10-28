
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { PageHeader } from '@/components/ui/page-header'
import { NewPermitForm } from '@/components/dashboard/new-permit-form'

export default async function ResidentNewPermitPage() {
  const supabase = await createClient()
  const session = await getResidentSession(supabase)

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch only the resident's active property
  const { data: prop } = await supabase
    .from('properties')
    .select('id, block, lot')
    .eq('id', session.property_id)
    .single()

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Apply for Construction Permit"
        description="Submit a new building, renovation, or demolition request for approval."
      />
      <NewPermitForm properties={prop ? [prop] : []} isAdmin={false} />
    </div>
  )
}
