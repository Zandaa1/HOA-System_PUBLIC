
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AmenityForm } from '@/components/forms/amenity-form'

export default async function EditAmenityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: amenity } = await supabase
    .from('amenities')
    .select('*')
    .eq('id', id)
    .single()

  if (!amenity) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Amenity</h1>
        <p className="text-sm text-muted-foreground">
          Update information for {amenity.name}
        </p>
      </div>

      <AmenityForm amenity={amenity} />
    </div>
  )
}
