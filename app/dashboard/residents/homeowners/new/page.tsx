
import { createClient } from '@/lib/supabase/server'
import { HomeownerForm } from '@/components/forms/homeowner-form'

export default async function NewHomeownerPage() {
  const supabase = await createClient()
  
  const { data: properties } = await supabase
    .from('properties')
    .select('id, block, lot')
    .order('block')
    .order('lot')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Homeowner</h1>
        <p className="text-sm text-muted-foreground">
          Register a new property owner in the system
        </p>
      </div>

      <HomeownerForm properties={(properties || []) as any} />
    </div>
  )
}
