
import { PropertyTypeForm } from '@/components/forms/property-type-form'

export default function NewPropertyTypePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Property Type</h1>
        <p className="text-sm text-muted-foreground">
          Define a new property classification
        </p>
      </div>

      <div className="max-w-2xl">
        <PropertyTypeForm />
      </div>
    </div>
  )
}
