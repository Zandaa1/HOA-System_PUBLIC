
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Vote, Calendar, Award } from 'lucide-react'
import Link from 'next/link'

export default async function ElectionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch Ballot with Options
  const { data: ballot } = await supabase
    .from('ballots')
    .select('*, options:ballot_options(*)')
    .eq('id', id)
    .single()

  if (!ballot) {
    notFound()
  }

  // 2. Fetch Votes
  const { data: votes } = await supabase
    .from('ballot_votes')
    .select(`
      id,
      created_at,
      option_id,
      option:ballot_options(option_text),
      property:properties(block, lot)
    `)
    .eq('ballot_id', id)

  const allVotes = votes || []
  const totalVotes = allVotes.length

  // 3. Compute counts
  const tally = (ballot.options as any[]).map((opt) => {
    const count = allVotes.filter((v) => v.option_id === opt.id).length
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    return {
      id: opt.id,
      text: opt.option_text,
      count,
      pct,
    }
  }).sort((a, b) => b.count - a.count)

  const winner = tally[0] && tally[0].count > 0 ? tally[0] : null

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm" variant="outline">
          <Link href="/dashboard/elections">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={ballot.title}
          description="Electoral results and voting turnout audit ledger."
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Results Progress Tally */}
        <Card className="md:col-span-2 border-muted/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Vote className="size-4 text-primary" /> Live Standings Tally
            </CardTitle>
            <CardDescription> Tally distribution across all {totalVotes} votes cast.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tally.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">{item.text}</span>
                  <span className="font-mono text-muted-foreground">
                    {item.count} votes ({item.pct}%)
                  </span>
                </div>
                <Progress value={item.pct} className="h-2.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Status card */}
        <Card className="border-muted/60 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-base font-bold">Turnout KPI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Ballot Window</p>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(ballot.start_date).toLocaleDateString()} to {new Date(ballot.end_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Turnout</p>
                <p className="text-3xl font-black mt-1 text-slate-800">{totalVotes} lots</p>
              </div>
            </CardContent>
          </div>

          {winner && (
            <div className="p-6 pt-0 border-t border-dashed mt-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-start gap-3 mt-4">
                <Award className="size-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Leading Option</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{winner.text}</p>
                  <p className="text-xs text-green-600 mt-0.5">{winner.count} votes cast</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Turnout Ledger */}
      <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Voter Turnout Audit Log</CardTitle>
          <CardDescription>Verify voter list ledger (votes are anonymous; option selected is omitted for security).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table suppressHydrationWarning>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Voter Property Lot</TableHead>
                <TableHead>Ballot Choice Text</TableHead>
                <TableHead className="text-right pr-6">Cast Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVotes.map((v: any) => {
                const prop = Array.isArray(v.property) ? v.property[0] : v.property
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold text-slate-800 pl-6">
                      {prop ? `Block ${prop.block} Lot ${prop.lot}` : '-'}
                    </TableCell>
                    <TableCell className="italic text-muted-foreground text-sm">
                      {v.option?.option_text || 'Submitted'}
                    </TableCell>
                    <TableCell className="text-right text-xs pr-6">
                      {new Date(v.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              {allVotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground italic py-8">
                    No votes registered yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
