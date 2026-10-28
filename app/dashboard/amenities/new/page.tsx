
import { AmenityForm } from '@/components/forms/amenity-form'

export default function NewAmenityPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Amenity</h1>
        <p className="text-sm text-muted-foreground">
          Register a new community facility or amenity
        </p>
      </div>

      <AmenityForm />
    </div>
  )
}
