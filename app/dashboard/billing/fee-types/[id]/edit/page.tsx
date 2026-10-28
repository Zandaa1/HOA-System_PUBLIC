
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FeeTypeForm } from '@/components/forms/fee-type-form'

export default async function EditFeeTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: feeType } = await supabase
    .from('fee_types')
    .select('*')
    .eq('id', id)
    .single()

  if (!feeType) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Fee Type</h1>
        <p className="text-sm text-muted-foreground">
          Update fee {feeType.name}
        </p>
      </div>

      <div className="max-w-2xl">
        <FeeTypeForm feeType={feeType} />
      </div>
    </div>
  )
}
