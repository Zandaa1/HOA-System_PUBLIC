
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { NewPermitForm } from '@/components/dashboard/new-permit-form'

export default async function NewPermitPage() {
  const supabase = await createClient()

  // Fetch properties (block & lot)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Log Construction Application"
        description="Submit a new building or renovation permit request on behalf of a resident."
      />
      <NewPermitForm properties={properties || []} isAdmin={true} />
    </div>
  )
}
