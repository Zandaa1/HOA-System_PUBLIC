
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatabaseBackup, Download } from 'lucide-react'

const exportTargets = [
  { table: 'properties', label: 'Properties' },
  { table: 'homeowners', label: 'Homeowners' },
  { table: 'renters', label: 'Renters' },
  { table: 'vehicles', label: 'Vehicles' },
  { table: 'invoices', label: 'Invoices' },
  { table: 'payments', label: 'Payments' },
  { table: 'amenity_bookings', label: 'Amenity Bookings' },
  { table: 'water_readings', label: 'Water Readings' },
  { table: 'staff', label: 'Staff' },
]

export default async function BackupPage() {
  const supabase = await createClient()

  const { data: latestAudit } = await supabase
    .from('audit_logs')
    .select('action, entity_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backup & Export</h1>
        <p className="text-sm text-muted-foreground">
          Export core records for offline backup and compliance reporting
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="size-4 text-primary" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download CSV snapshots of major modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {exportTargets.map((target) => (
            <Button key={target.table} asChild variant="outline" className="justify-start">
              <a href={`/api/export/${target.table}`} download>
                <Download className="mr-2 size-4" />
                {target.label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent System Activity</CardTitle>
          <CardDescription>
            Latest audit events to help validate backup timing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {latestAudit?.map((log, index) => (
            <div key={`${log.created_at}-${index}`} className="rounded border p-2">
              <div className="font-medium">{log.action}</div>
              <div className="text-muted-foreground">
                {log.entity_type} · {log.created_at}
              </div>
            </div>
          ))}
          {(!latestAudit || latestAudit.length === 0) && (
            <p className="text-muted-foreground">No audit records available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
