
import { FeeTypeForm } from '@/components/forms/fee-type-form'

export default function NewFeeTypePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Fee Type</h1>
        <p className="text-sm text-muted-foreground">
          Define a new billable product or service
        </p>
      </div>

      <div className="max-w-2xl">
        <FeeTypeForm />
      </div>
    </div>
  )
}
