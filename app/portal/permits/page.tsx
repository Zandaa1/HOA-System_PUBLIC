
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentSession } from '@/lib/supabase/resident'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-status-pending-bg text-status-pending border-status-pending-border',
  approved: 'bg-status-paid-bg text-status-paid border-status-paid-border',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-status-overdue-bg text-status-overdue border-status-overdue-border',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

const typeLabels: Record<string, string> = {
  renovation: 'Renovation',
  new_construction: 'New Construction',
  demolition: 'Demolition',
  other: 'Other',
}

export default async function ResidentPermitsPage() {
  const supabase = await createClient()
  const session = await getResidentSession(supabase)

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch permits for the property
  const { data: permits } = await supabase
    .from('construction_permits')
    .select(`
      *,
      property:properties(block, lot)
    `)
    .eq('property_id', session.property_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Construction & Renovation Permits"
        description="Apply for subdivision permits, view active project statuses, and track bonds."
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/portal/permits/new">
              <Plus className="mr-2 size-4" />
              Apply for Permit
            </Link>
          </Button>
        }
      />

      <div className="bg-white rounded-lg border border-muted/60 shadow-sm overflow-hidden">
        <Table suppressHydrationWarning>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Permit Fee</TableHead>
              <TableHead className="text-right">Bond Deposit</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(permits || []).map((permit) => (
              <TableRow key={permit.id}>
                <TableCell className="font-semibold text-slate-800">
                  {typeLabels[permit.permit_type] || permit.permit_type}
                </TableCell>
                <TableCell>{permit.description || '-'}</TableCell>
                <TableCell className="font-medium">{permit.applicant_name}</TableCell>
                <TableCell className="text-xs">
                  {permit.start_date} to {permit.estimated_end_date}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  ₱{Number(permit.permit_fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  ₱{Number(permit.bond_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`${statusColors[permit.status]} uppercase text-[10px] font-bold`}>
                    {permit.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(!permits || permits.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground italic py-8">
                  No permit applications logged yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
