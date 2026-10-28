
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AdvanceDepositEditForm } from './advance-deposit-edit-form'

export default async function EditAdvanceDepositPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: properties }] = await Promise.all([
    supabase.from('advance_deposits').select('*').eq('id', id).single(),
    supabase.from('properties').select('id, block, lot').order('block').order('lot'),
  ])

  if (!item) notFound()

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Advance Deposit</h1>
        <p className="text-sm text-muted-foreground">Update advance deposit details</p>
      </div>
      <AdvanceDepositEditForm item={item} properties={properties || []} />
    </div>
  )
}
