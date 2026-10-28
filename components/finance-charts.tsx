
'use client'

import * as React from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(n)

const fmtShort = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(0)}k`
      : `₱${n}`

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed text-center text-sm italic text-muted-foreground">
      {message}
    </div>
  )
}

function topRows<T>(rows: T[], count = 6) {
  return rows.slice(0, count)
}

interface FinanceChartsProps {
  cashFlow: { month: string; collections: number; disbursements: number }[]
  expenses: { category: string; amount: number }[]
  revenue: { feeType: string; amount: number }[]
  bankBalances: { name: string; balance: number }[]
}

/* ── Cash Flow Trend (full-width area) ──────────────────────────── */

const cashFlowConfig = {
  collections: {
    label: 'Collections',
    color: 'var(--chart-2)',
  },
  disbursements: {
    label: 'Disbursements',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function CashFlowTrend({ data }: { data: FinanceChartsProps['cashFlow'] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">12-Month Cash Flow</CardTitle>
        <CardDescription>Collections and disbursements by month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="No monthly cash flow data available yet." />
        ) : (
          <ChartContainer config={cashFlowConfig} className="h-[340px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} tickMargin={8} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="collections" fill="var(--color-collections)" stroke="var(--color-collections)" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="disbursements" fill="var(--color-disbursements)" stroke="var(--color-disbursements)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Income vs Expenses (bar) ───────────────────────────────────── */

const incomeExpenseConfig = {
  collections: {
    label: 'Income',
    color: 'var(--chart-2)',
  },
  disbursements: {
    label: 'Expenses',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function IncomeVsExpenses({ data }: { data: FinanceChartsProps['cashFlow'] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
        <CardDescription>Monthly totals</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart message="No monthly income or expense data available yet." />
        ) : (
          <ChartContainer config={incomeExpenseConfig} className="h-[280px] w-full">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} tickMargin={8} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={fmtShort} width={55} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <Bar dataKey="collections" fill="var(--color-collections)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="disbursements" fill="var(--color-disbursements)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Expense Categories (horizontal bar) ─────────────────────────── */

function ExpenseCategories({ data }: { data: FinanceChartsProps['expenses'] }) {
  const config: ChartConfig = {
    amount: {
      label: 'Amount',
      color: 'var(--chart-1)',
    },
  }

  const chartData = topRows(data)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
        <CardDescription>Top disbursement categories</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart message="No spending data available yet." />
        ) : (
          <ChartContainer config={config} className="h-[280px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Revenue by Fee Type (horizontal bar) ────────────────────────── */

function RevenueByFeeType({ data }: { data: FinanceChartsProps['revenue'] }) {
  const config: ChartConfig = {
    amount: {
      label: 'Amount',
      color: 'var(--chart-2)',
    },
  }

  const chartData = topRows(data)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Revenue by Fee Type</CardTitle>
        <CardDescription>Top collection sources</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart message="No revenue data available yet." />
        ) : (
          <ChartContainer config={config} className="h-[280px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="feeType" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Bank Balances (horizontal bar) ─────────────────────────────── */

const bankBalancesConfig = {
  balance: {
    label: 'Balance',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

function BankBalances({ data }: { data: FinanceChartsProps['bankBalances'] }) {
  const chartData = topRows(data)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Bank Balances</CardTitle>
        <CardDescription>Book balance by account</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyChart message="No bank balance data available yet." />
        ) : (
          <ChartContainer config={bankBalancesConfig} className="h-[280px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={fmtShort} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(Number(value))} />} />
              <Bar dataKey="balance" fill="var(--color-balance)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Exported composite ─────────────────────────────────────────── */

export function FinanceCharts({
  cashFlow,
  expenses,
  revenue,
  bankBalances,
}: FinanceChartsProps) {
  return (
    <div className="space-y-4">
      <CashFlowTrend data={cashFlow} />

      <div className="grid gap-4 lg:grid-cols-2">
        <IncomeVsExpenses data={cashFlow} />
        <BankBalances data={bankBalances} />
        <ExpenseCategories data={expenses} />
        <RevenueByFeeType data={revenue} />
      </div>
    </div>
  )
}
