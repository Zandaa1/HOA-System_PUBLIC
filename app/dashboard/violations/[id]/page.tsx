
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from "@/components/ui/page-header"
import { ViolationDetailsClient } from './violation-details-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ViolationDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch violation
  const { data: violation } = await supabase
    .from('violations')
    .select(`
      *,
      property:properties(
        id, block, lot, phase,
        homeowners(id, first_name, last_name, email, phone),
        renters(id, first_name, last_name, email, phone, is_active)
      ),
      category:violation_categories(*)
    `)
    .eq('id', id)
    .single()

  if (!violation) {
    notFound()
  }

  // Fetch logs
  const { data: logs } = await supabase
    .from('violation_logs')
    .select('*')
    .eq('violation_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Violation Case Detail"
        description={`Case ID: ${violation.id}`}
      />
      <ViolationDetailsClient violation={violation} logs={logs || []} />
    </div>
  )
}
