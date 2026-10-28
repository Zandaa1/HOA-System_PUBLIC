'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Vote, CheckCircle2, Calendar, Loader2 } from 'lucide-react'
import { castVoteAction } from '@/lib/actions/elections'

interface VotingClientProps {
  ballots: any[]
  castVotes: string[] // List of ballot IDs this property has already voted on
  propertyId: string
  residentId: string
  residentType: 'homeowner' | 'renter'
}

export function VotingClient({ ballots, castVotes, propertyId, residentId, residentType }: VotingClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selections, setSelections] = useState<Record<string, string>>({})

  const handleSelectOption = (ballotId: string, optionId: string) => {
    setSelections({ ...selections, [ballotId]: optionId })
  }

  const handleVoteSubmit = (ballotId: string) => {
    const optionId = selections[ballotId]
    if (!optionId) {
      toast.error('Please select an option before casting your vote.')
      return
    }

    startTransition(async () => {
      try {
        await castVoteAction({
          ballotId,
          propertyId,
          residentId,
          residentType,
          optionId,
        })
        toast.success('Vote submitted successfully!')
        router.refresh()
      } catch (err: any) {
        toast.error(`Failed to submit vote: ${err.message}`)
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {ballots.map((ballot) => {
        const hasVoted = castVotes.includes(ballot.id)
        const selectedOption = selections[ballot.id] || ''

        return (
          <Card key={ballot.id} className="border-muted/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <Vote className="size-5 text-primary" /> {ballot.title}
                  </CardTitle>
                  {ballot.description && (
                    <CardDescription className="mt-1">{ballot.description}</CardDescription>
                  )}
                </div>
                {hasVoted ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> VOTE CAST
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1">
                    ACTIVE BALLOT
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {hasVoted ? (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-6 text-center text-sm text-slate-600 font-medium">
                  Thank you! Your property has already submitted a ballot. Votes are secure and anonymous.
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select One Option:</p>
                  <RadioGroup
                    value={selectedOption}
                    onValueChange={(val) => handleSelectOption(ballot.id, val)}
                    className="grid gap-2"
                  >
                    {ballot.options?.map((opt: any) => (
                      <div key={opt.id} className="flex items-center space-x-3 rounded-lg border border-muted/60 p-4 hover:bg-slate-50/50 transition-colors">
                        <RadioGroupItem value={opt.id} id={opt.id} />
                        <Label htmlFor={opt.id} className="font-semibold text-slate-700 w-full cursor-pointer">
                          {opt.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
            {!hasVoted && (
              <CardFooter className="flex justify-between items-center border-t border-muted/60 pt-4 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3.5" /> Closes: {new Date(ballot.end_date).toLocaleString()}
                </span>
                <Button onClick={() => handleVoteSubmit(ballot.id)} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit Choice
                </Button>
              </CardFooter>
            )}
          </Card>
        )
      })}

      {ballots.length === 0 && (
        <div className="bg-white border border-muted/60 rounded-lg shadow-sm p-12 text-center">
          <Vote className="size-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Active Ballots</h3>
          <p className="text-sm text-muted-foreground">There are no ongoing elections or referendums at this time.</p>
        </div>
      )}
    </div>
  )
}
