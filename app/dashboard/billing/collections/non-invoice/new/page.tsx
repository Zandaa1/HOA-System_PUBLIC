
import { PageHeader } from '@/components/ui/page-header'
import { createClient } from '@/lib/supabase/server'
import { NonInvoiceForm } from './non-invoice-form'

export default async function NewNonInvoicePage() {
  const supabase = await createClient()
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="New Non-Invoice Collection"
        description="Record bank interest or other miscellaneous income"
      />
      <NonInvoiceForm bankAccounts={bankAccounts || []} />
    </div>
  )
}
