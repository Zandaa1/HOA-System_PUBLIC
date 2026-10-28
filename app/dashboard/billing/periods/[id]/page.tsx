
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function BillingPeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: period }, { count: invoiceCount }] = await Promise.all([
    supabase.from('billing_periods').select('*').eq('id', id).single(),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('billing_period_id', id),
  ])

  if (!period) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing/periods">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{period.name}</h1>
            <p className="text-sm text-muted-foreground">Billing period profile</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/dashboard/billing/periods/${id}/edit`}>
            <Pencil className="mr-2 size-4" />
            Edit Period
          </Link>
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Period Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Start Date</span>
            <span>{period.start_date}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">End Date</span>
            <span>{period.end_date}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Due Date</span>
            <span>{period.due_date}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={period.is_closed ? 'outline' : 'secondary'}>
              {period.is_closed ? 'Closed' : 'Open'}
            </Badge>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Linked Invoices</span>
            <span>{invoiceCount || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
