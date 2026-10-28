
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Eye, Calendar } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { GenerateYearButton } from '@/components/generate-year-button'
import { DeletePeriodButton } from '@/components/delete-period-button'

export default async function BillingPeriodsPage() {
  const supabase = await createClient()

  const { data: periods } = await supabase
    .from('billing_periods')
    .select('*')
    .order('start_date', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Billing Periods"
        description="Manage billing cycles and periods"
        action={
          <div className="flex gap-2">
            <GenerateYearButton />
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/billing/periods/new">
                <Plus className="mr-2 size-4" />
                Add Period
              </Link>
            </Button>
          </div>
        }
      />

      {(!periods || periods.length === 0) ? (
        <EmptyState
          title="No Billing Periods Yet"
          description="You don't have any billing periods defined. Create a billing period to start generating water bills and monthly dues."
          icon={Calendar}
          actionLabel="Add Period"
          actionHref="/dashboard/billing/periods/new"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {periods.map((period) => (
            <Card key={period.id} className="shadow-sm border-muted/60 transition-all hover:shadow-md">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-lg font-bold text-primary">{period.name}</CardTitle>
                  <Badge variant="secondary" className={`text-[10px] font-bold border ${!period.is_closed ? 'bg-status-paid-bg text-status-paid border-status-paid-border' : 'bg-status-inactive-bg text-status-inactive border-status-inactive-border'}`}>
                    {period.is_closed ? 'CLOSED' : 'OPEN'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {period.start_date} <span className="mx-1 text-muted-foreground/50">→</span> {period.end_date}
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div className="flex items-center justify-between text-sm py-2 border-y border-muted/60">
                  <span className="text-muted-foreground font-medium">Due Date</span>
                  <span className="font-bold text-primary">{period.due_date}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild className="flex-1 h-9">
                    <Link href={`/dashboard/billing/periods/${period.id}`}>
                      <Eye className="mr-2 size-4" />
                      View
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="size-9 p-0 hover:bg-muted">
                    <Link href={`/dashboard/billing/periods/${period.id}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <DeletePeriodButton periodId={period.id} periodName={period.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
