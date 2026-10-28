
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { FinanceCharts } from '@/components/finance-charts'
import { Plus, ArrowDownRight, Landmark, Receipt, CreditCard, AlertTriangle, Percent, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const fmtCompact = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 100_000) return `₱${Math.round(n / 1_000).toLocaleString('en-PH')}k`
  return fmt(n)
}

export default async function FinancePage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('name')

  const [
    { data: payments },
    { data: nonInvoiceCollections },
    { data: disbursements },
    { data: transfers },
    { data: recentDisbursements },
    { data: openInvoices },
  ] = await Promise.all([
    supabase.from('payments').select('amount, bank_account_id'),
    supabase.from('non_invoice_collections').select('amount, bank_account_id'),
    supabase
      .from('disbursements')
      .select('amount, bank_account_id, is_advance_release, is_fund_transfer'),
    supabase
      .from('account_transfers')
      .select('amount, source_bank_account_id, destination_bank_account_id'),
    supabase
      .from('disbursements')
      .select('*, bank_account:bank_accounts(*)')
      .order('payment_date', { ascending: false })
      .limit(5),
    supabase
      .from('invoices')
      .select('balance, total_amount, status')
      .in('status', ['pending', 'overdue', 'partial'])
      .gt('balance', 0),
  ])

  const bookBalance: Record<string, number> = {}
  for (const account of accounts || []) {
    bookBalance[account.id] = 0
  }
  for (const payment of payments || []) {
    bookBalance[payment.bank_account_id] = (bookBalance[payment.bank_account_id] || 0) + Number(payment.amount)
  }
  for (const collection of nonInvoiceCollections || []) {
    bookBalance[collection.bank_account_id] = (bookBalance[collection.bank_account_id] || 0) + Number(collection.amount)
  }
  for (const disbursement of disbursements || []) {
    if (disbursement.is_advance_release || disbursement.is_fund_transfer) continue
    bookBalance[disbursement.bank_account_id] = (bookBalance[disbursement.bank_account_id] || 0) - Number(disbursement.amount)
  }
  for (const transfer of transfers || []) {
    bookBalance[transfer.source_bank_account_id] = (bookBalance[transfer.source_bank_account_id] || 0) - Number(transfer.amount)
    bookBalance[transfer.destination_bank_account_id] = (bookBalance[transfer.destination_bank_account_id] || 0) + Number(transfer.amount)
  }

  const totalCash = Object.values(bookBalance).reduce((s, v) => s + v, 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [{ data: monthPayments }, { data: monthNonInvoice }, { data: monthExpenses }] = await Promise.all([
    supabase.from('payments').select('amount').gte('payment_date', monthStart),
    supabase.from('non_invoice_collections').select('amount').gte('payment_date', monthStart),
    supabase
      .from('disbursements')
      .select('amount')
      .eq('is_advance_release', false)
      .eq('is_fund_transfer', false)
      .gte('payment_date', monthStart),
  ])
  const moneyInThisMonth =
    (monthPayments || []).reduce((sum, row) => sum + Number(row.amount), 0) +
    (monthNonInvoice || []).reduce((sum, row) => sum + Number(row.amount), 0)
  const moneyOutThisMonth = (monthExpenses || []).reduce((sum, row) => sum + Number(row.amount), 0)
  const stillOwed = (openInvoices || []).reduce((sum, row) => sum + Number(row.balance), 0)
  const overdueCount = (openInvoices || []).filter((row) => row.status === 'overdue').length
  const openInvoiceTotal = (openInvoices || []).reduce((sum, row) => sum + Number(row.total_amount), 0)
  const collectionRate = openInvoiceTotal > 0 ? Math.round(((openInvoiceTotal - stillOwed) / openInvoiceTotal) * 100) : 100

  // Chart data: cash flow rollup (last 12 months)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const [{ data: cashFlowRaw }, { data: disbursementCategories }, { data: paymentsWithFeeType }] = await Promise.all([
    supabase
      .from('cash_flow_rollup')
      .select('period_month, period_year, total_collected, total_disbursed'),
    supabase
      .from('disbursements')
      .select('category, amount')
      .eq('is_advance_release', false)
      .eq('is_fund_transfer', false),
    supabase
      .from('payments')
      .select('amount, invoice:invoices(invoice_items(fee_type:fee_types(name)))')
      .gte('payment_date', twelveMonthsAgo.toISOString().slice(0, 10)),
  ])

  // Process cash flow by month
  const cashFlowMap = new Map<string, { month: string; collections: number; disbursements: number }>()
  for (const row of cashFlowRaw || []) {
    const key = `${row.period_year}-${String(row.period_month).padStart(2, '0')}`
    const label = new Date(row.period_year, row.period_month - 1).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
    if (!cashFlowMap.has(key)) {
      cashFlowMap.set(key, { month: label, collections: 0, disbursements: 0 })
    }
    const entry = cashFlowMap.get(key)!
    entry.collections += Number(row.total_collected)
    entry.disbursements += Number(row.total_disbursed)
  }
  const cashFlow = Array.from(cashFlowMap.values()).slice(-12)

  // Process expense categories
  const expenseCatMap = new Map<string, number>()
  for (const d of disbursementCategories || []) {
    const cat = d.category || 'Other'
    expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + Number(d.amount))
  }
  const expenses = Array.from(expenseCatMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Process revenue by fee type
  const feeTypeMap = new Map<string, number>()
  for (const p of paymentsWithFeeType || []) {
    const invoice = p.invoice as any
    const items = invoice?.invoice_items || []
    for (const item of items) {
      const feeName = item.fee_type?.name || 'Other'
      feeTypeMap.set(feeName, (feeTypeMap.get(feeName) || 0) + Number(item.amount))
    }
  }
  const revenue = Array.from(feeTypeMap.entries())
    .map(([feeType, amount]) => ({ feeType, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Process bank balances
  const bankBalances = (accounts || [])
    .map((acc: any) => ({
      name: acc.name,
      balance: bookBalance[acc.id] || 0,
    }))
    .sort((a, b) => b.balance - a.balance)

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Finance"
        description="Cash position, collections risk, and spending control at a glance"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/finance/bank-accounts">
                <Landmark className="mr-2 size-4" />Manage Banks
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/finance/disbursements">
                <Plus className="mr-2 size-4" />New Disbursement
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <FinanceMetric title="Cash Available" value={fmtCompact(totalCash)} detail={fmt(totalCash)} icon={Landmark} />
        <FinanceMetric title="Money In" value={fmtCompact(moneyInThisMonth)} detail="This month" icon={CreditCard} tone="success" />
        <FinanceMetric title="Money Out" value={fmtCompact(moneyOutThisMonth)} detail="This month" icon={ArrowDownRight} tone="danger" />
        <FinanceMetric title="Still Owed" value={fmtCompact(stillOwed)} detail={fmt(stillOwed)} icon={Receipt} tone={stillOwed > 0 ? 'warning' : 'default'} />
        <FinanceMetric title="Overdue" value={String(overdueCount)} detail="Invoices" icon={AlertTriangle} tone={overdueCount > 0 ? 'danger' : 'default'} />
        <FinanceMetric title="Collection Rate" value={`${collectionRate}%`} detail="Open invoices" icon={Percent} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <FinanceCharts
          cashFlow={cashFlow}
          expenses={expenses}
          revenue={revenue}
          bankBalances={bankBalances}
        />
        <NeedsAttention
          stillOwed={stillOwed}
          overdueCount={overdueCount}
          collectionRate={collectionRate}
          moneyOutThisMonth={moneyOutThisMonth}
          moneyInThisMonth={moneyInThisMonth}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Recent Disbursements</CardTitle>
              <CardDescription>Latest cash outflows for review</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/finance/disbursements">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(!recentDisbursements || recentDisbursements.length === 0) ? (
            <p className="py-8 text-center text-sm italic text-muted-foreground">No disbursements recorded yet.</p>
          ) : (
            <div className="divide-y" suppressHydrationWarning>
              {(recentDisbursements as any[]).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <ArrowDownRight className="size-4 shrink-0 text-status-overdue" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.payee}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.category} · {d.bank_account?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono font-semibold tabular-nums text-status-overdue">{fmt(Number(d.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FinanceMetric({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: string
  detail: string
  icon: any
  tone?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-status-paid',
    danger: 'text-status-overdue',
    warning: 'text-status-pending',
  }[tone]

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function NeedsAttention({
  stillOwed,
  overdueCount,
  collectionRate,
  moneyOutThisMonth,
  moneyInThisMonth,
}: {
  stillOwed: number
  overdueCount: number
  collectionRate: number
  moneyOutThisMonth: number
  moneyInThisMonth: number
}) {
  const spendingIsAhead = moneyOutThisMonth > moneyInThisMonth && moneyOutThisMonth > 0
  const status = overdueCount > 0 || spendingIsAhead ? 'attention' : stillOwed > 0 ? 'monitor' : 'clear'

  const title = {
    attention: 'Follow-up needed',
    monitor: 'Monitor open balances',
    clear: 'Collections are clear',
  }[status]

  const description = {
    attention: overdueCount > 0
      ? 'Overdue invoices should be reviewed before the next billing cycle.'
      : 'This month\'s spending is higher than collections so far.',
    monitor: 'Open balances remain, but none are marked overdue.',
    clear: 'No overdue or open invoice balances are currently flagged.',
  }[status]

  const Icon = status === 'clear' ? CheckCircle2 : AlertTriangle
  const iconClass = status === 'clear' ? 'text-status-paid' : status === 'monitor' ? 'text-status-pending' : 'text-status-overdue'

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Needs Attention</CardTitle>
        <CardDescription>Plain-language finance signals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-3 rounded-lg border bg-muted/30 p-4">
          <Icon className={`mt-0.5 size-5 shrink-0 ${iconClass}`} />
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm">
          <AttentionRow label="Still owed" value={fmt(stillOwed)} tone={stillOwed > 0 ? 'warning' : 'default'} />
          <AttentionRow label="Overdue invoices" value={String(overdueCount)} tone={overdueCount > 0 ? 'danger' : 'default'} />
          <AttentionRow label="Collection rate" value={`${collectionRate}%`} />
          <AttentionRow label="This month net" value={fmt(moneyInThisMonth - moneyOutThisMonth)} tone={spendingIsAhead ? 'danger' : 'success'} />
        </div>
      </CardContent>
    </Card>
  )
}

function AttentionRow({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'warning'
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-status-paid',
    danger: 'text-status-overdue',
    warning: 'text-status-pending',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  )
}
