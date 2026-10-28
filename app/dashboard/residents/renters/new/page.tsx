
import { createClient } from '@/lib/supabase/server'
import { RenterForm } from '@/components/forms/renter-form'

export default async function NewRenterPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Renter</h1>
        <p className="text-sm text-muted-foreground">
          Register a new tenant in the system
        </p>
      </div>

      <RenterForm properties={(properties || []) as any} />
    </div>
  )
}
