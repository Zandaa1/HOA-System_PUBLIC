'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Vote, Plus, Eye, ToggleLeft, ToggleRight, Trash2, Calendar, Loader2 } from 'lucide-react'
import { createBallotAction, toggleBallotActiveAction, deleteBallotAction } from '@/lib/actions/elections'
import Link from 'next/link'

interface ElectionsClientProps {
  ballots: any[]
}

export function ElectionsClient({ ballots }: ElectionsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)

  // Form States
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16)) // datetime-local format
  const [endDate, setEndDate] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleOptionChange = (index: number, val: string) => {
    const newOptions = [...options]
    newOptions[index] = val
    setOptions(newOptions)
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleCreateSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required')
      return
    }

    const validOptions = options.filter((o) => o.trim() !== '')
    if (validOptions.length < 2) {
      toast.error('Please specify at least 2 voting options')
      return
    }

    startTransition(async () => {
      try {
        await createBallotAction({
          title,
          description,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          options: validOptions,
        })
        toast.success('Ballot election created successfully.')
        setCreateOpen(false)
        // Reset form
        setTitle('')
        setDescription('')
        setOptions(['', ''])
      } catch (err: any) {
        toast.error(`Creation failed: ${err.message}`)
      }
    })
  }

  const handleToggleActive = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleBallotActiveAction(id, !currentActive)
        toast.success(`Ballot status updated successfully.`)
      } catch (err: any) {
        toast.error(`Toggle failed: ${err.message}`)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this ballot? All cast votes will be permanently deleted.')) return
    startTransition(async () => {
      try {
        await deleteBallotAction(id)
        toast.success('Ballot deleted successfully.')
      } catch (err: any) {
        toast.error(`Deletion failed: ${err.message}`)
      }
    })
  }

  const getBallotStatus = (b: any) => {
    const now = new Date()
    const start = new Date(b.start_date)
    const end = new Date(b.end_date)

    if (!b.is_active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-500 border-gray-200' }
    if (now < start) return { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (now > end) return { label: 'Closed', color: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border' }
    return { label: 'Ongoing', color: 'bg-status-paid-bg text-status-paid border-status-paid-border' }
  }

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">Elections & Ordinances</h2>
          <p className="text-sm text-muted-foreground">Manage active community votes and constitutional referendums.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" /> Create Ballot
        </Button>
      </div>

      <div className="bg-white border border-muted/60 rounded-lg shadow-sm overflow-hidden">
        <Table suppressHydrationWarning>
          <TableHeader>
            <TableRow>
              <TableHead>Ballot / Referendum Title</TableHead>
              <TableHead>Voting window</TableHead>
              <TableHead className="text-center">Options</TableHead>
              <TableHead className="text-center">Votes Cast</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ballots.map((ballot) => {
              const status = getBallotStatus(ballot)
              return (
                <TableRow key={ballot.id}>
                  <TableCell className="font-semibold text-slate-800">
                    <div>
                      <p>{ballot.title}</p>
                      {ballot.description && (
                        <p className="text-xs text-muted-foreground font-normal max-w-md truncate">{ballot.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground" />
                      {new Date(ballot.start_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="text-muted-foreground block text-[10px]">to</span>
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="size-3 text-muted-foreground" />
                      {new Date(ballot.end_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{ballot.options?.length || 0}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-700">{ballot.votes?.length || 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`${status.color} uppercase text-[10px] font-bold`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button asChild size="icon-sm" variant="outline" title="View Results">
                        <Link href={`/dashboard/elections/${ballot.id}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        title={ballot.is_active ? 'Disable Ballot' : 'Enable Ballot'}
                        onClick={() => handleToggleActive(ballot.id, ballot.is_active)}
                        disabled={isPending}
                      >
                        {ballot.is_active ? (
                          <ToggleRight className="size-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        title="Delete Ballot"
                        onClick={() => handleDelete(ballot.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {ballots.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground italic py-8">
                  No ballots created yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Ballot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Digital Ballot</DialogTitle>
            <DialogDescription>
              Deploy a new constitutional subdivision vote or board election ballot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="title">Ballot / Question Title</Label>
              <Input
                id="title"
                placeholder="e.g. 2026 HOA Board of Directors Election"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description / Instructions</Label>
              <Textarea
                id="desc"
                placeholder="Describe the referendum or provide candidate profiles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Voting Starts</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end">Voting Closes</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Voting Options / Candidates</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option #${i + 1} (e.g. Candidate Name, Yes/No)`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button size="icon" variant="outline" className="shrink-0" onClick={() => handleRemoveOption(i)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={handleAddOption}>
                + Add Option
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Publish Ballot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
