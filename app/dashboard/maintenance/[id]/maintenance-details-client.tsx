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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wrench, Calendar, DollarSign, CheckCircle, Ban, History, User, Phone, Mail, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { getOptimizedStorageUrl } from '@/lib/utils'

interface MaintenanceDetailsClientProps {
  request: any
  vendors: any[]
}

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  assigned: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  in_progress: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  completed: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  cancelled: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
}

const priorityColors: Record<string, string> = {
  low: 'bg-status-inactive-bg text-status-inactive border-status-inactive-border',
  medium: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  high: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  emergency: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border animate-pulse',
}

export function MaintenanceDetailsClient({ request, vendors }: MaintenanceDetailsClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)

  // Assignment states
  const [vendorId, setVendorId] = useState(request.assigned_vendor_id || '')
  const [scheduledDate, setScheduledDate] = useState(request.scheduled_date || '')
  const [estimatedCost, setEstimatedCost] = useState(request.estimated_cost?.toString() || '0')

  // Completion states
  const [actualCost, setActualCost] = useState(request.actual_cost?.toString() || '0')
  const [completionNotes, setCompletionNotes] = useState('')

  const supabase = createClient()

  const handleAssignVendor = async () => {
    if (!vendorId) return alert('Please select a vendor')
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_vendor_id: vendorId,
          scheduled_date: scheduledDate || null,
          estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (error) throw error

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign vendor')
    } finally {
      setIsLoading(false)
      setIsAssignOpen(false)
    }
  }

  const handleUpdateStatus = async (status: string, extra = {}) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...extra
        })
        .eq('id', request.id)

      if (error) throw error

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsLoading(false)
      setIsCompleteOpen(false)
    }
  }

  const activeRenters = request.property?.renters?.filter((r: any) => r.is_active) || []
  const residents = [
    ...(request.property?.homeowners || []).map((h: any) => ({ ...h, role: 'Owner' })),
    ...activeRenters.map((r: any) => ({ ...r, role: 'Renter' }))
  ]

  return (
    <div className="space-y-6">
      {/* Top status banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${statusColors[request.status]}`}>
            {statusLabels[request.status]}
          </Badge>
          <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold capitalize ${priorityColors[request.priority]}`}>
            {request.priority} Priority
          </Badge>
          <span className="text-sm text-muted-foreground">
            Submitted on {format(new Date(request.created_at), 'dd MMMM yyyy')}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Work order details */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Job Description</CardTitle>
              <CardDescription>Issue logged details and category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Title</Label>
                <p className="text-base font-bold text-foreground mt-1">{request.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Category</Label>
                <p className="text-sm font-semibold text-foreground capitalize mt-1">{request.category}</p>
              </div>
              <div>
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Description</Label>
                <p className="text-sm text-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling & Vendor Assignment */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Vendor Assignment & Costs</CardTitle>
              <CardDescription>Dispatch details and financial logs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Assigned Vendor</Label>
                  {request.vendor ? (
                    <div className="mt-2 space-y-1">
                      <p className="font-bold text-foreground">{request.vendor.name}</p>
                      {request.vendor.contact_person && (
                        <p className="text-xs text-muted-foreground">Contact: {request.vendor.contact_person}</p>
                      )}
                      {request.vendor.phone && (
                        <p className="text-xs text-muted-foreground">Phone: {request.vendor.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2 italic">No vendor assigned yet.</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Schedule Date</Label>
                  <p className="font-semibold text-foreground mt-2">
                    {request.scheduled_date ? format(new Date(request.scheduled_date), 'dd MMMM yyyy') : 'Not scheduled'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Estimated Cost</Label>
                  <p className="font-bold text-foreground mt-1 text-base">
                    ₱{Number(request.estimated_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Actual Final Cost</Label>
                  <p className="font-bold text-foreground mt-1 text-base">
                    ₱{Number(request.actual_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {request.status === 'completed' && request.completion_date && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground uppercase text-xs tracking-wider">Completion Details</Label>
                  <p className="text-sm text-foreground mt-1">
                    Job marked completed on {format(new Date(request.completion_date), 'dd MMMM yyyy')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions panel */}
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Work Order Workflow
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {(request.status === 'pending' || request.status === 'assigned') && (
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <Wrench className="mr-2 h-4 w-4" />
                      {request.assigned_vendor_id ? 'Reassign Vendor' : 'Assign & Schedule Vendor'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Service Vendor</DialogTitle>
                      <DialogDescription>
                        Select an accredited provider and log schedule/estimates.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <Label htmlFor="vendor">Select Vendor</Label>
                        <Select value={vendorId} onValueChange={setVendorId}>
                          <SelectTrigger id="vendor">
                            <SelectValue placeholder="Choose vendor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name} ({v.specialty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sched">Scheduled Date</Label>
                        <Input
                          id="sched"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="est">Estimated Job Cost (₱)</Label>
                        <Input
                          id="est"
                          type="number"
                          step="0.01"
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAssignVendor} disabled={isLoading}>
                        Confirm Assignment
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {request.status === 'assigned' && (
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                  onClick={() => handleUpdateStatus('in_progress')}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Mark In Progress
                </Button>
              )}

              {request.status === 'in_progress' && (
                <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Job Completed
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Complete Work Order</DialogTitle>
                      <DialogDescription>
                        Confirm completion of maintenance activities and record final contractor costs.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <Label htmlFor="act">Actual Cost (₱)</Label>
                        <Input
                          id="act"
                          type="number"
                          step="0.01"
                          value={actualCost}
                          onChange={(e) => setActualCost(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() =>
                          handleUpdateStatus('completed', {
                            actual_cost: parseFloat(actualCost),
                            completion_date: new Date().toISOString().split('T')[0]
                          })
                        }
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Complete Order
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {request.status !== 'completed' && request.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  size="sm"
                  onClick={() => {
                    if (confirm('Cancel this maintenance request?')) {
                      handleUpdateStatus('cancelled')
                    }
                  }}
                  disabled={isLoading}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel Request
                </Button>
              )}

              {(request.status === 'completed' || request.status === 'cancelled') && (
                <p className="text-sm font-semibold text-muted-foreground">
                  This work order is closed. No pending dispatch actions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Property and resident info */}
        <div className="space-y-6">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                Property & Reporter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={`/dashboard/properties/${request.property?.id}`}
                  className="text-lg font-bold text-primary hover:underline"
                >
                  Block {request.property?.block}, Lot {request.property?.lot}
                </Link>
                {request.property?.phase && (
                  <p className="text-xs text-muted-foreground">Phase {request.property.phase}</p>
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

          {request.photo_urls?.length > 0 && (
            <Card className="border-muted/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Photos Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {request.photo_urls.map((url: string, index: number) => (
                  <a
                    key={index}
                    href={getOptimizedStorageUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-md border"
                  >
                    <img
                      src={getOptimizedStorageUrl(url, { width: 500, height: 300, resize: 'cover' })}
                      alt="Maintenance Submission Photo"
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
