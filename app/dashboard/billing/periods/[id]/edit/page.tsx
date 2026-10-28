
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BillingPeriodForm } from '@/components/forms/billing-period-form'

export default async function EditBillingPeriodPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: period } = await supabase
    .from('billing_periods')
    .select('*')
    .eq('id', id)
    .single()

  if (!period) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Billing Period</h1>
        <p className="text-sm text-muted-foreground">
          Update period {period.name}
        </p>
      </div>

      <div className="max-w-2xl">
        <BillingPeriodForm period={period} />
      </div>
    </div>
  )
}
