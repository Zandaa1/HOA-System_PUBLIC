
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RenterForm } from '@/components/forms/renter-form'

export default async function EditRenterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: renter }, { data: properties }] = await Promise.all([
    supabase.from('renters').select('*').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!renter) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Renter</h1>
        <p className="text-sm text-muted-foreground">
          Update information for {renter.first_name} {renter.last_name}
        </p>
      </div>

      <RenterForm renter={renter} properties={(properties || []) as any} />
    </div>
  )
}
