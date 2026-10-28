
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from "@/components/ui/page-header"
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { InvoicesTable } from './invoices-table'

export default async function InvoicesPage(props: {
  searchParams: Promise<{ page?: string; search?: string; property_id?: string }>
}) {
  const searchParams = await props.searchParams
  const page = parseInt(searchParams.page || '1', 10)
  const search = searchParams.search || ''
  const propertyId = searchParams.property_id || ''

  const pageSize = 15
  const from = (page - 1) * pageSize
  const to = page * pageSize - 1

  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(`
      *,
      property:properties(id, block, lot),
      billing_period:billing_periods(name)
    `, { count: 'exact' })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  } else if (search) {
    query = query.ilike('invoice_number', `%${search}%`)
  }

  const { data: invoices, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalCount = count || 0
  const pageCount = Math.ceil(totalCount / pageSize)
  const currentPage = page - 1

  // Fetch property details if filtering by property
  let propertyLabel = ''
  if (propertyId) {
    const { data: prop } = await supabase
      .from('properties')
      .select('block, lot')
      .eq('id', propertyId)
      .single()
    if (prop) {
      propertyLabel = `Block ${prop.block}, Lot ${prop.lot}`
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={propertyId ? `Invoices — ${propertyLabel}` : 'Invoices'}
        description={propertyId ? `Showing invoices for ${propertyLabel}` : 'Manage billing invoices'}
        action={
          <div className="flex gap-3">
            <Button asChild size="sm" variant="outline" className="h-9 px-4">
              <Link href="/dashboard/billing/dues?tab=generator">
                Generate Batch
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 px-4">
              <Link href="/dashboard/billing/invoices/new">
                <Plus className="mr-2 size-4" />
                Create Invoice
              </Link>
            </Button>
          </div>
        }
      />

      <InvoicesTable 
        invoices={invoices || []} 
        totalCount={totalCount}
        pageCount={pageCount}
        currentPage={currentPage}
      />
    </div>
  )
}
