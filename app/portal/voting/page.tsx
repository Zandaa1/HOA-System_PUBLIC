
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { PageHeader } from '@/components/ui/page-header'
import { VotingClient } from '@/components/portal/voting-client'

export default async function ResidentVotingPage() {
  const supabase = await createClient()
  const session = await getResidentSession(supabase)

  if (!session) {
    redirect('/auth/login')
  }

  // 1. Fetch active ballots with options
  const { data: ballots } = await supabase
    .from('ballots')
    .select(`
      *,
      options:ballot_options(*)
    `)
    .eq('is_active', true)
    .gte('end_date', new Date().toISOString())
    .order('created_at', { ascending: false })

  // 2. Fetch ballots already voted on by this property
  const { data: castVotes } = await supabase
    .from('ballot_votes')
    .select('ballot_id')
    .eq('property_id', session.property_id)

  const votedBallotIds = (castVotes || []).map((cv) => cv.ballot_id)

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Community Voting & Referendums"
        description="Cast your vote on constitutional ordinances and subdivision elections."
      />

      <VotingClient
        ballots={ballots || []}
        castVotes={votedBallotIds}
        propertyId={session.property_id}
        residentId={session.resident_id}
        residentType={session.resident_type}
      />
    </div>
  )
}
