
import { createClient } from '@/lib/supabase/server'
import { PropertyForm } from '@/components/forms/property-form'

export default async function NewPropertyPage() {
  const supabase = await createClient()
  
  const { data: propertyTypes } = await supabase
    .from('property_types')
    .select('*')
    .order('name')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Property</h1>
        <p className="text-sm text-muted-foreground">
          Create a new property record
        </p>
      </div>

      <PropertyForm propertyTypes={propertyTypes || []} />
    </div>
  )
}
