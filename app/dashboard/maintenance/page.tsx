
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { MaintenanceTable } from './maintenance-table'
import { requireModule } from '@/lib/check-module'

export default async function MaintenancePage() {
  await requireModule('enable_maintenance')
  const supabase = await createClient()

  // Fetch Requests
  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:properties(id, block, lot, phase),
      vendor:maintenance_vendors(id, name)
    `)
    .order('created_at', { ascending: false })

  const allRequests = requests || []
  const pendingCount = allRequests.filter(r => r.status === 'pending').length
  const activeCount = allRequests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length
  const completedCount = allRequests.filter(r => r.status === 'completed').length

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Maintenance Work Orders"
        description="Streamline subdivision maintenance workflows from resident report to contractor signoff"
        action={
          <Button asChild variant="outline" size="sm" className="h-9 px-4">
            <Link href="/dashboard/maintenance/vendors">
              <Settings className="mr-2 size-4" />
              Manage Vendors
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-amber-600">
            {pendingCount}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              In Progress / Assigned
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-blue-600">
            {activeCount}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="pb-2 pt-5 px-6">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Completed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold px-6 pb-6 text-green-600">
            {completedCount}
          </CardContent>
        </Card>
      </div>

      <MaintenanceTable data={allRequests} />
    </div>
  )
}
