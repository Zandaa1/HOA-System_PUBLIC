
import { createClient } from '@/lib/supabase/server'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollText, Eye } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

const actionColors: Record<string, string> = {
  INSERT: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  UPDATE: 'bg-status-partial-bg text-status-partial border-status-partial-border',
  DELETE: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
}

export default async function AuditLogsPage() {
  const supabase = await createClient()

  // 1. Resolve developer staff ID & current user staff ID
  const [devSettingRes, userRes] = await Promise.all([
    supabase.from('system_settings').select('setting_value').eq('setting_key', 'developer_staff_id').maybeSingle(),
    supabase.auth.getUser()
  ])

  const devId = devSettingRes.data?.setting_value
  const user = userRes.data?.user

  const { data: staffMember } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user?.id)
    .maybeSingle()

  const isDeveloper = staffMember?.id === devId

  // 2. Query logs (filter out developer actions for non-developers)
  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      created_at,
      ip_address,
      staff:staff!staff_id(first_name, last_name)
    `)

  if (!isDeveloper && devId) {
    query = query.neq('staff_id', devId)
  }

  const { data: logs } = await query
    .order('created_at', { ascending: false })
    .limit(200)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Audit Log"
        description="Showing last 200 significant data changes system-wide"
      />

      <div className="px-6">
        <Card className="shadow-sm border-muted/60 overflow-x-auto">
          <CardContent className="p-0 min-w-full inline-block align-middle">
            <Table suppressHydrationWarning>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b">
                  <TableHead className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Timestamp</TableHead>
                  <TableHead className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Action</TableHead>
                  <TableHead className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Entity</TableHead>
                  <TableHead className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Staff</TableHead>
                  <TableHead className="h-12 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                    <TableCell className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatDate(log.created_at!)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="secondary" className={`text-[11px] font-bold ${actionColors[log.action] || ''}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="text-sm font-bold capitalize text-primary">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="block font-mono text-[11px] text-muted-foreground truncate max-w-[150px] mt-0.5">
                          {log.entity_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-medium">
                      {log.staff
                        ? `${(log.staff as any).first_name} ${(log.staff as any).last_name}`
                        : <span className="italic text-muted-foreground font-normal">System</span>}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-9 p-0 hover:bg-accent/50">
                            <Eye className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Change Details</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-bold mb-3 uppercase text-muted-foreground tracking-widest">Before</h4>
                                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px] border">
                                  {log.old_values ? JSON.stringify(log.old_values, null, 2) : 'No previous data'}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold mb-3 uppercase text-muted-foreground tracking-widest">After</h4>
                                <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-auto max-h-[400px] border">
                                  {log.new_values ? JSON.stringify(log.new_values, null, 2) : 'No new data'}
                                </pre>
                              </div>
                            </div>
                            <div className="text-xs font-medium text-muted-foreground pt-3 border-t flex justify-between">
                              <span>Entity ID: <code className="bg-muted px-1 rounded">{log.entity_id}</code></span>
                              <span>IP Address: {log.ip_address || '—'}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
