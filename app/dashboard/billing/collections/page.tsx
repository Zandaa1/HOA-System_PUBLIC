
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollectionCombinedTable } from './collection-combined-table'
import { NonInvoiceCollectionsTable } from './non-invoice/non-invoice-table'
import { AdvanceDepositsTable } from './advance-deposits/advance-deposits-table'
import { OutstandingTable } from './outstanding-table'

function daysBetween(a: string, b: string): number {
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default async function CollectionsPage() {
  const supabase = await createClient()

  const [{ data: combined }, { data: nonInvoice }, { data: advanceDeposits }, { data: invoices }, { data: depositCredits }] = await Promise.all([
    supabase.from('combined_collections_list').select('*'),
    supabase.from('non_invoice_collections').select('*, bank_account:bank_accounts(*)').order('payment_date', { ascending: false }),
    supabase.from('advance_deposits').select('*, property:properties(block, lot)').order('deposit_date', { ascending: false }),
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, due_date, balance, total_amount, status,
        property:properties!inner(id, block, lot, homeowners(first_name, last_name))
      `)
      .in('status', ['pending', 'overdue'])
      .gt('balance', 0)
      .order('due_date', { ascending: true }),
    supabase
      .from('advance_deposits')
      .select('property_id, remaining_balance')
      .gt('remaining_balance', 0),
  ])

  // Group outstanding invoices by property with aging
  const today = new Date().toISOString().slice(0, 10)
  const creditMap = new Map<string, number>()
  for (const d of depositCredits || []) {
    creditMap.set(d.property_id, (creditMap.get(d.property_id) || 0) + Number(d.remaining_balance))
  }

  const propertyMap = new Map<string, {
    propertyId: string
    block: string
    lot: string
    homeowners: { first_name: string; last_name: string }[]
    invoices: { id: string; invoice_number: string; due_date: string; balance: number; total_amount: number; status: string }[]
    aging: { current: number; days1_30: number; days31_60: number; days61_90: number; days90plus: number }
    totalOutstanding: number
  }>()

  for (const inv of invoices || []) {
    const prop = inv.property as any
    if (!prop) continue
    const pid = prop.id
    if (!propertyMap.has(pid)) {
      propertyMap.set(pid, {
        propertyId: pid,
        block: prop.block,
        lot: prop.lot,
        homeowners: prop.homeowners || [],
        invoices: [],
        aging: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0 },
        totalOutstanding: 0,
      })
    }
    const entry = propertyMap.get(pid)!
    const balance = Number(inv.balance)
    entry.invoices.push({
      id: inv.id,
      invoice_number: inv.invoice_number,
      due_date: inv.due_date,
      balance,
      total_amount: Number(inv.total_amount),
      status: inv.status,
    })
    entry.totalOutstanding += balance

    // Aging
    const daysOverdue = daysBetween(inv.due_date, today)
    if (daysOverdue <= 0) {
      entry.aging.current += balance
    } else if (daysOverdue <= 30) {
      entry.aging.days1_30 += balance
    } else if (daysOverdue <= 60) {
      entry.aging.days31_60 += balance
    } else if (daysOverdue <= 90) {
      entry.aging.days61_90 += balance
    } else {
      entry.aging.days90plus += balance
    }
  }

  const outstandingData = Array.from(propertyMap.values()).map((entry) => ({
    ...entry,
    advanceDepositCredit: creditMap.get(entry.propertyId) || 0,
    netOutstanding: entry.totalOutstanding - (creditMap.get(entry.propertyId) || 0),
  }))

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Collections"
        description="All income sources, outstanding balances, and advance deposits"
      />

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            All Collections
          </TabsTrigger>
          <TabsTrigger value="non-invoice" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Non-Invoice
          </TabsTrigger>
          <TabsTrigger value="advance-deposits" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Advance Deposits
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Outstanding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <CollectionCombinedTable data={combined || []} />
        </TabsContent>

        <TabsContent value="non-invoice" className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <NonInvoiceCollectionsTable data={nonInvoice || []} />
        </TabsContent>

        <TabsContent value="advance-deposits" className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <AdvanceDepositsTable data={advanceDeposits || []} />
        </TabsContent>

        <TabsContent value="outstanding" className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <OutstandingTable data={outstandingData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
