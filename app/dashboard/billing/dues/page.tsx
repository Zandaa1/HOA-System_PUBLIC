
import { createClient } from '@/lib/supabase/server'
import { DuesGenerator } from './dues-generator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FinancialChart } from '@/components/financial-chart'
import { Badge } from '@/components/ui/badge'
import { Zap, TrendingUp, AlertCircle, CheckCircle2, Building2, Wallet } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/ui/page-header'

export default async function DuesOverviewPage(props: {
  searchParams: Promise<{ tab?: string }>
}) {
  const searchParams = await props.searchParams
  const defaultTab = searchParams.tab || 'dashboard'

  const supabase = await createClient()

  const [
    { data: propertyTypes },
    { data: billingPeriods },
    { data: feeTypes },
    { data: allInvoices },
  ] = await Promise.all([
    supabase
      .from('property_types')
      .select('id, name, default_monthly_dues, color')
      .order('name'),
    supabase
      .from('billing_periods')
      .select('id, name, start_date, end_date, due_date, is_closed')
      .order('start_date', { ascending: false }),
    supabase
      .from('fee_types')
      .select('id, name, default_amount')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('invoices')
      .select(`
        id, 
        total_amount, 
        balance, 
        status, 
        billing_period_id,
        billing_period:billing_periods(name, start_date)
      `)
      .order('issue_date', { ascending: true }),
  ])

  const dueFeeType =
    feeTypes?.find((fee) => fee.name.toLowerCase().includes('dues')) || null

  // Calculate Stats
  const totalReceivable = allInvoices?.reduce((sum, inv) => sum + inv.balance, 0) || 0
  const totalInvoiced = allInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
  const collectionRate = totalInvoiced > 0 ? ((totalInvoiced - totalReceivable) / totalInvoiced) * 100 : 0
  
  const overdueInvoices = allInvoices?.filter(inv => inv.status === 'overdue') || []
  const pendingInvoices = allInvoices?.filter(inv => inv.status === 'pending') || []

  // Group by Billing Period for Chart
  const periodDataMap = new Map<string, { month: string; collected: number; invoiced: number; start: string }>()
  
  allInvoices?.forEach(inv => {
    if (!inv.billing_period_id || !inv.billing_period) return
    const periodName = (inv.billing_period as any).name
    const periodStart = (inv.billing_period as any).start_date
    
    const existing = periodDataMap.get(inv.billing_period_id) || { 
      month: periodName, 
      collected: 0, 
      invoiced: 0,
      start: periodStart 
    }
    
    existing.invoiced += inv.total_amount
    existing.collected += (inv.total_amount - inv.balance)
    periodDataMap.set(inv.billing_period_id, existing)
  })

  const chartData = Array.from(periodDataMap.values())
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(({ month, collected, invoiced }) => ({ month, collected, invoiced }))

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Dues Overview"
        description="Monitor collections, track delinquency, and manage monthly billing cycles"
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="ml-6 bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="generator" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Generate Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <div className="grid gap-6 md:grid-cols-4 px-6">
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-primary font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                  <Wallet className="size-3.5" /> Total Outstanding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  ₱{totalReceivable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="bg-muted/50 border-muted/60 text-muted-foreground text-[10px] font-bold">
                    {pendingInvoices.length} PENDING
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-status-paid font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                  <TrendingUp className="size-3.5" /> Collection Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-status-paid tracking-tight">
                  {collectionRate.toFixed(1)}%
                </div>
                <Progress 
                  value={collectionRate} 
                  className="h-1.5 mt-3 bg-status-paid-bg border border-status-paid-border/30" 
                  indicatorClassName="bg-status-paid" 
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-status-overdue font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                  <AlertCircle className="size-3.5" /> Overdue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-status-overdue tracking-tight">
                  {overdueInvoices.length}
                </div>
                <p className="text-xs text-status-overdue/70 mt-1 font-medium italic">Requires follow-up</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted/60">
              <CardHeader className="pb-2">
                <CardDescription className="text-status-partial font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
                  <Building2 className="size-3.5" /> Billed Units
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-status-partial tracking-tight">
                  {allInvoices?.length || 0}
                </div>
                <p className="text-xs text-status-partial/70 mt-1 font-medium">Active periods</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3 px-6">
            <Card className="md:col-span-2 shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle className="text-base font-bold">Collection Trend</CardTitle>
                <CardDescription className="text-xs font-medium">Comparison of invoiced amount vs. actual collections</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <FinancialChart data={chartData} />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle className="text-base font-bold">Quick Summary</CardTitle>
                <CardDescription className="text-xs font-medium">Status breakdown of all dues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-600" /> Paid
                  </span>
                  <span className="font-bold tabular-nums">
                    {allInvoices?.filter(i => i.status === 'paid').length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-muted/60 pt-4">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <Zap className="size-4 text-primary" /> Pending
                  </span>
                  <span className="font-bold tabular-nums">
                    {pendingInvoices.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-muted/60 pt-4">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <AlertCircle className="size-4 text-orange-600" /> Overdue
                  </span>
                  <span className="font-bold tabular-nums">
                    {overdueInvoices.length}
                  </span>
                </div>
                <div className="pt-6">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <p className="text-[10px] text-primary/60 uppercase font-bold tracking-widest mb-1">Recent Cycle</p>
                    <div className="text-sm font-bold">{billingPeriods?.[0]?.name || 'No active cycle'}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                      Due on {billingPeriods?.[0]?.due_date ? new Date(billingPeriods[0].due_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="generator" className="motion-safe:animate-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 px-6">
          <DuesGenerator
            propertyTypes={propertyTypes || []}
            billingPeriods={billingPeriods || []}
            dueFeeType={dueFeeType}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
