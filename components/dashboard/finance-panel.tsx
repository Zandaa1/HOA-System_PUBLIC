import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinancialChart } from '@/components/financial-chart'
import { ArrowDownRight, ArrowUpRight, ExternalLink, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancePanelProps {
  chartData: Array<{ month: string; invoiced: number; collected: number }>
  thisMonthInvoiced: number
  thisMonthCollected: number
}

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function FinancePanel({
  chartData,
  thisMonthInvoiced,
  thisMonthCollected,
}: FinancePanelProps) {
  const lastMonth = chartData.length >= 2 ? chartData[chartData.length - 2] : null
  const invoicedDelta = lastMonth ? thisMonthInvoiced - lastMonth.invoiced : 0
  const collectedDelta = lastMonth ? thisMonthCollected - lastMonth.collected : 0
  const collectionRate =
    thisMonthInvoiced > 0 ? Math.min(100, Math.round((thisMonthCollected / thisMonthInvoiced) * 100)) : 0

  return (
    <Card className="border-border/60 bg-card shadow-sm h-full">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            Finance Pulse
          </CardTitle>
          <Link
            href="/dashboard/finance"
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Open Finance <ExternalLink className="size-3" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Invoiced vs. collected — last 6 months</p>
      </CardHeader>
      <CardContent className="px-6 pb-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <SummaryStat
            label="Invoiced (mo.)"
            value={fmt(thisMonthInvoiced)}
            delta={invoicedDelta}
            hint="vs. last month"
            tone="primary"
          />
          <SummaryStat
            label="Collected (mo.)"
            value={fmt(thisMonthCollected)}
            delta={collectedDelta}
            hint="vs. last month"
            tone="success"
          />
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Collection Rate
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-extrabold tracking-tight tabular-nums">
                {collectionRate}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-status-paid transition-[width] duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
          </div>
        </div>
        <FinancialChart data={chartData} />
      </CardContent>
    </Card>
  )
}

function SummaryStat({
  label,
  value,
  delta,
  hint,
  tone,
}: {
  label: string
  value: string
  delta: number
  hint?: string
  tone: 'primary' | 'success'
}) {
  const positive = delta >= 0
  const zero = delta === 0
  const DeltaIcon = zero ? ArrowUpRight : positive ? ArrowUpRight : ArrowDownRight
  const deltaColor = zero
    ? 'text-muted-foreground'
    : positive
      ? 'text-emerald-600'
      : 'text-red-600'
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2.5',
        tone === 'primary'
          ? 'border-primary/20 bg-primary/[0.02]'
          : 'border-status-paid-border/20 bg-status-paid-bg/[0.02]',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-base font-extrabold tracking-tight tabular-nums mt-1 truncate',
          tone === 'primary' ? 'text-primary' : 'text-emerald-700',
        )}
      >
        {value}
      </p>
      {delta !== 0 && (
        <div className={cn('flex items-center gap-1 text-[10px] font-semibold mt-0.5', deltaColor)}>
          <DeltaIcon className="size-2.5" />
          <span className="tabular-nums">
            {positive ? '+' : ''}
            {fmt(delta)}
          </span>
          {hint && <span className="text-muted-foreground font-normal ml-1">{hint}</span>}
        </div>
      )}
    </div>
  )
}
