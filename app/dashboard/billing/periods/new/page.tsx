
import { BillingPeriodForm } from '@/components/forms/billing-period-form'

export default function NewBillingPeriodPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Billing Period</h1>
        <p className="text-sm text-muted-foreground">
          Define a new cycle for association dues
        </p>
      </div>

      <div className="max-w-2xl">
        <BillingPeriodForm />
      </div>
    </div>
  )
}
