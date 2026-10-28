
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ElectionsClient } from '@/components/dashboard/elections-client'

export default async function ElectionsAdminPage() {
  const supabase = await createClient()

  // Fetch all ballots with option details and vote counts
  const { data: ballots } = await supabase
    .from('ballots')
    .select(`
      *,
      options:ballot_options(id, option_text),
      votes:ballot_votes(id)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Subdivision Elections & Balloting"
        description="Launch democratic board member elections or vote on subdivision ordinance referendums."
      />

      <ElectionsClient ballots={ballots || []} />
    </div>
  )
}
