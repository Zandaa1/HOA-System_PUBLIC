
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from "@/components/ui/page-header"
import { MaintenanceDetailsClient } from './maintenance-details-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MaintenanceDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch request
  const { data: request } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(
        id, block, lot, phase,
        homeowners(id, first_name, last_name, email, phone),
        renters(id, first_name, last_name, email, phone, is_active)
      ),
      vendor:maintenance_vendors(*)
    `)
    .eq('id', id)
    .single()

  if (!request) {
    notFound()
  }

  // Fetch active vendors
  const { data: vendors } = await supabase
    .from('maintenance_vendors')
    .select('*')
    .eq('status', 'active')
    .order('name')

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Maintenance Work Order"
        description={`Work Order ID: ${request.id}`}
      />
      <MaintenanceDetailsClient request={request} vendors={vendors || []} />
    </div>
  )
}
