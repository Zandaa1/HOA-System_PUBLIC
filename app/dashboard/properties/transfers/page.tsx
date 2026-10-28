
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRightLeft, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default async function TransfersPage() {
  const supabase = await createClient()

  const { data: homeowners } = await supabase
    .from('homeowners')
    .select('id, first_name, last_name, move_in_date, property:properties(id, block, lot)')
    .order('move_in_date', { ascending: false })
    .limit(25)

  const homeownerTransfers = (homeowners || []).map((row) => ({
    id: row.id,
    residentType: 'Homeowner',
    name: `${row.first_name} ${row.last_name}`,
    moveIn: row.move_in_date,
    moveOut: null as string | null,
    property: (Array.isArray(row.property) ? row.property[0] : row.property) as any,
  }))

  const rows = [...homeownerTransfers].sort((a, b) =>
    (b.moveIn || '').localeCompare(a.moveIn || '')
  )

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Property Transfers"
        description="Track resident handovers and update ownership or tenancy records"
        action={
          <div className="flex gap-3">
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/residents/homeowners/new">
                <Plus className="mr-2 size-4" />
                Add Homeowner
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="pb-4 pt-5 px-6 border-b">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ArrowRightLeft className="size-5 text-primary" />
            Recent Transfer Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b">
                <TableHead className="h-11 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Resident</TableHead>
                <TableHead className="h-11 px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Type</TableHead>
                <TableHead className="h-11 px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Property</TableHead>
                <TableHead className="h-11 px-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Move-in</TableHead>
                <TableHead className="h-11 px-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">Move-out</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.residentType}-${row.id}`} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                  <TableCell className="px-6 py-3.5 font-bold text-sm text-primary">{row.name}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${row.residentType === 'Homeowner' ? 'bg-status-partial-bg text-status-partial' : 'bg-status-partial-bg text-status-partial'}`}>
                      {row.residentType}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm">
                    {row.property ? (
                      <Link
                        href={`/dashboard/properties/${row.property.id}`}
                        className="text-primary font-bold hover:underline"
                      >
                        Blk {row.property.block}, Lot {row.property.lot}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-sm font-medium tabular-nums text-muted-foreground">{row.moveIn || '-'}</TableCell>
                  <TableCell className="px-6 py-3.5 text-sm font-medium tabular-nums">
                    {row.moveOut ? (
                      <span className="text-amber-700">{row.moveOut}</span>
                    ) : (
                      <span className="text-green-600">Current</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-muted-foreground italic text-sm">
                    No transfer records yet.
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
