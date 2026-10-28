
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { NonInvoiceCollectionsTable } from './non-invoice-table'

export default async function NonInvoicePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('non_invoice_collections')
    .select('*, bank_account:bank_accounts(*)')
    .order('payment_date', { ascending: false })

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Non-Invoice Collections"
        description="Bank interest and other miscellaneous income"
        action={
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/dashboard/billing/collections/non-invoice/new">
              <Plus className="mr-2 size-4" />
              Add Collection
            </Link>
          </Button>
        }
      />

      <NonInvoiceCollectionsTable data={data || []} />
    </div>
  )
}
