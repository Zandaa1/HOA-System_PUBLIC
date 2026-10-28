
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { NonInvoiceEditForm } from './non-invoice-edit-form'

export default async function EditNonInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: item }, { data: bankAccounts }] = await Promise.all([
    supabase.from('non_invoice_collections').select('*').eq('id', id).single(),
    supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!item) notFound()

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Collection</h1>
        <p className="text-sm text-muted-foreground">Update non-invoice collection details</p>
      </div>
      <NonInvoiceEditForm item={item} bankAccounts={bankAccounts || []} />
    </div>
  )
}
