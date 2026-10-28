
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PropertyTypeForm } from '@/components/forms/property-type-form'

export default async function EditPropertyTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: propertyType } = await supabase
    .from('property_types')
    .select('*')
    .eq('id', id)
    .single()

  if (!propertyType) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Property Type</h1>
        <p className="text-sm text-muted-foreground">
          Update {propertyType.name} classification
        </p>
      </div>

      <div className="max-w-2xl">
        <PropertyTypeForm propertyType={propertyType} />
      </div>
    </div>
  )
}
