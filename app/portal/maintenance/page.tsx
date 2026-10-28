
import { createClient } from '@/lib/supabase/server'
import { getResidentSession } from '@/lib/supabase/resident'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench, Plus, Calendar, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { EmptyState } from '@/components/ui/empty-state'
import { getOptimizedStorageUrl } from '@/lib/utils'

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  assigned: 'Scheduled',
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

export default async function ResidentMaintenancePage() {
  const supabase = await createClient()
  const residentSession = await getResidentSession(supabase)

  if (!residentSession) {
    redirect('/auth/login')
  }

  // Fetch maintenance requests for the resident's property
  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      vendor:maintenance_vendors(name)
    `)
    .eq('property_id', residentSession.property_id)
    .order('created_at', { ascending: false })

  const allRequests = requests || []

  return (
    <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 pb-12 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Maintenance Requests</h1>
          <p className="text-muted-foreground mt-1">
            Submit repair requests and track ongoing work orders for Block {residentSession.block} Lot {residentSession.lot}
          </p>
        </div>
        <Button asChild size="sm" className="h-9 px-4">
          <Link href="/portal/maintenance/new">
            <Plus className="mr-2 size-4" />
            New Request
          </Link>
        </Button>
      </div>

      {allRequests.length === 0 ? (
        <EmptyState
          title="No Maintenance Logs Yet"
          description="Everything at your residence seems to be in order! If there are community repairs needed or issues with property infrastructure, log a request."
          icon={Wrench}
          actionLabel="Submit Request"
          actionHref="/portal/maintenance/new"
        />
      ) : (
        <div className="grid gap-6">
          {allRequests.map((req) => (
            <Card key={req.id} className="border-muted/60 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold text-primary">{req.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <Badge variant="secondary" className="capitalize text-xs font-semibold">
                        {req.category}
                      </Badge>
                      <Badge variant="outline" className={`capitalize font-semibold text-xs ${priorityColors[req.priority]}`}>
                        {req.priority} Priority
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold ${statusColors[req.status]}`}>
                    {statusLabels[req.status] || req.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {req.description}
                </p>

                {req.photo_urls && req.photo_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {req.photo_urls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={getOptimizedStorageUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="h-20 w-20 rounded-md overflow-hidden border block hover:opacity-90"
                      >
                        <img
                          src={getOptimizedStorageUrl(url, { width: 150, height: 150, resize: 'cover' })}
                          alt="Incident Photo"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-t pt-4 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary/70" />
                    <span>Reported on {format(new Date(req.created_at), 'dd MMM yyyy')}</span>
                  </div>
                  {req.vendor && (
                    <div className="flex items-center gap-2">
                      <Wrench className="size-4 text-primary/70" />
                      <span className="font-semibold text-foreground">
                        Assigned Vendor: {req.vendor.name}
                      </span>
                    </div>
                  )}
                  {req.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-primary/70" />
                      <span>Scheduled: {format(new Date(req.scheduled_date), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
