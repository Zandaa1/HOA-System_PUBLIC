'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ShieldAlert, FileText, Pencil, Printer, Calendar, Landmark, CheckCircle, Ban, History, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { getOptimizedStorageUrl } from '@/lib/utils'

interface ViolationDetailsClientProps {
  violation: any
  logs: any[]
}

const statusLabels: Record<string, string> = {
  warning_issued: 'Warning Issued',
  fine_issued: 'Fine Issued',
  resolved: 'Resolved',
  appealed: 'Appealed',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, string> = {
  warning_issued: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  fine_issued: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
  resolved: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  appealed: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
}

export function ViolationDetailsClient({ violation, logs }: ViolationDetailsClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [actionNotes, setActionNotes] = useState('')
  const [fineAmount, setFineAmount] = useState(violation.fine_applied.toString())
  const [isFineDialogOpen, setIsFineDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [isAppealDialogOpen, setIsAppealDialogOpen] = useState(false)

  const supabase = createClient()

  const handleUpdateStatus = async (status: string, details: string, extraUpdates = {}) => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('No user found')

      const { error: updateError } = await supabase
        .from('violations')
        .update({
          status,
          portal_alert_dismissed: false, // Reset dismiss state for residents to see the update
          ...extraUpdates
        })
        .eq('id', violation.id)

      if (updateError) throw updateError

      const { error: logError } = await supabase
        .from('violation_logs')
        .insert({
          violation_id: violation.id,
          action: statusLabels[status] || status,
          performed_by: userData.user.id,
          details: details + (actionNotes ? ` Notes: ${actionNotes}` : ''),
        })

      if (logError) throw logError

      setActionNotes('')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update violation')
    } finally {
      setIsLoading(false)
      setIsFineDialogOpen(false)
      setIsResolveDialogOpen(false)
      setIsAppealDialogOpen(false)
    }
  }

  const activeRenters = violation.property?.renters?.filter((r: any) => r.is_active) || []
  const residents = [
    ...(violation.property?.homeowners || []).map((h: any) => ({ ...h, role: 'Owner' })),
    ...activeRenters.map((r: any) => ({ ...r, role: 'Renter' }))
  ]

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${statusColors[violation.status]}`}>
            {statusLabels[violation.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Incident logged on {format(new Date(violation.incident_date), 'dd MMMM yyyy')}
          </span>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/violations/${violation.id}/print`}>
              <Printer className="mr-2 h-4 w-4" />
              Print Notice
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/dashboard/violations/${violation.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit details
            </Link>
          </Button>
        </div>
      </div>

      {/* Main details layout */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Violation Information</CardTitle>
              <CardDescription>Details of the registered incident</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Title / Offense</Label>
                <p className="text-base font-bold text-foreground mt-1">{violation.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Description</Label>
                <p className="text-sm text-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                  {violation.description || 'No detailed description provided.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Category</Label>
                  <p className="font-semibold text-foreground mt-1">
                    {violation.category?.name || 'Uncategorized'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Fine Applied</Label>
                  <p className="font-semibold text-foreground mt-1 text-base">
                    ₱{Number(violation.fine_applied).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {violation.notes && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Private Staff Notes</Label>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{violation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick status updates workflow */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Update Status / Actions</CardTitle>
              <CardDescription>HOA Management manual compliance overrides</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {violation.status === 'warning_issued' && (
                <>
                  <Dialog open={isFineDialogOpen} onOpenChange={setIsFineDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Landmark className="mr-2 h-4 w-4" />
                        Assess Fine
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assess Discretionary Fine</DialogTitle>
                        <DialogDescription>
                          Apply a monetary penalty to this violation notice. The resident will see this fine inside their dashboard.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1">
                          <Label>Fine Amount (₱)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={fineAmount}
                            onChange={(e) => setFineAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Remarks / Details</Label>
                          <Textarea
                            placeholder="Add reason for fine details..."
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFineDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleUpdateStatus(
                              'fine_issued',
                              `Discretionary fine assessed: ₱${parseFloat(fineAmount).toFixed(2)}.`,
                              { fine_applied: parseFloat(fineAmount) }
                            )
                          }
                          disabled={isLoading}
                        >
                          Confirm & Fine
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Resolved
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Violation Resolved</DialogTitle>
                        <DialogDescription>
                          Verify compliance and close this incident.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        <Label>Resolution Notes</Label>
                        <Textarea
                          placeholder="Explain how the resident resolved the violation..."
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus('resolved', 'Violation marked resolved by staff.')}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Resolve
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    size="sm"
                    onClick={() => {
                      if (confirm('Cancel this warning?')) {
                        handleUpdateStatus('cancelled', 'Warning cancelled by management.')
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Cancel Warning
                  </Button>
                </>
              )}

              {violation.status === 'fine_issued' && (
                <>
                  <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Resolved (Paid)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mark Violation Resolved</DialogTitle>
                        <DialogDescription>
                          Confirm payment of fine and resolution of the incident.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        <Label>Resolution Notes</Label>
                        <Textarea
                          placeholder="Specify receipt details or resolution inspection notes..."
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus('resolved', 'Fine settled. Violation closed.')}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Resolve
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isAppealDialogOpen} onOpenChange={setIsAppealDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <History className="mr-2 h-4 w-4" />
                        Log Appeal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Resident Appeal</DialogTitle>
                        <DialogDescription>
                          Record that the resident submitted an appeal or explanation for review by the board.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        <Label>Appeal Details</Label>
                        <Textarea
                          placeholder="Provide details of the resident's appeal claim..."
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAppealDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => handleUpdateStatus('appealed', 'Resident filed a formal appeal.')} disabled={isLoading}>
                          File Appeal
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {violation.status === 'appealed' && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    onClick={() => {
                      if (confirm('Approve appeal and waive fine?')) {
                        handleUpdateStatus('resolved', 'Appeal approved by board. Fine waived.', { fine_applied: 0 })
                      }
                    }}
                    disabled={isLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Appeal (Waive)
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Deny appeal and maintain fine?')) {
                        handleUpdateStatus('fine_issued', 'Appeal denied. Fine remains active.')
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Deny Appeal
                  </Button>
                </>
              )}

              {(violation.status === 'resolved' || violation.status === 'cancelled') && (
                <p className="text-sm font-semibold text-muted-foreground">
                  This case is closed. No further compliance actions needed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline of violation action logs */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Case History & Compliance Log
              </CardTitle>
              <CardDescription>DHSUD compliance audit records for this notice</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No case actions have been logged yet.</p>
              ) : (
                <div className="relative border-l border-muted/80 pl-6 space-y-6">
                  {logs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-bold text-foreground uppercase tracking-wider">{log.action}</span>
                          <span>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                        <p className="text-sm text-foreground">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Property and resident info */}
        <div className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Target Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={`/dashboard/properties/${violation.property?.id}`}
                  className="text-lg font-bold text-primary hover:underline"
                >
                  Block {violation.property?.block}, Lot {violation.property?.lot}
                </Link>
                {violation.property?.phase && (
                  <p className="text-xs text-muted-foreground">Phase {violation.property.phase}</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Associated Residents</Label>
                {residents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No resident profiles linked to this lot.</p>
                ) : (
                  <div className="space-y-3">
                    {residents.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="size-4 text-muted-foreground" />
                        </div>
                        <div className="grid leading-tight">
                          <span className="text-sm font-semibold">
                            {r.first_name} {r.last_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {r.role} {r.phone ? `· ${r.phone}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {violation.photo_urls?.length > 0 && (
            <Card className="border-muted/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Photo Evidence
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {violation.photo_urls.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={getOptimizedStorageUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-md border"
                  >
                    <img
                      src={getOptimizedStorageUrl(url, { width: 500, height: 300, resize: 'cover' })}
                      alt="Incident Documentation"
                      className="h-48 w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
