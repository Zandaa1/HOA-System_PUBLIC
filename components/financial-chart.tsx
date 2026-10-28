'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MonthlyData {
  month: string
  collected: number
  invoiced: number
}

interface FinancialChartProps {
  data: MonthlyData[]
}

const formatPeso = (v: number) =>
  v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`

export function FinancialChart({ data }: FinancialChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] text-xs text-muted-foreground italic">
        No financial data yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={16} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          minTickGap={10}
        />
        <YAxis
          tickFormatter={formatPeso}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
            name === 'collected' ? 'Collected' : 'Invoiced',
          ]}
          labelFormatter={(label) => <span className="font-semibold text-foreground">{label}</span>}
          contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', backgroundColor: 'var(--card)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', padding: '8px 12px' }}
          cursor={{ fill: 'var(--muted)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 12, opacity: 0.8 }}
          formatter={(v) => <span className="capitalize font-medium text-foreground">{v}</span>}
          iconType="circle"
          iconSize={6}
        />
        <Bar dataKey="invoiced" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Invoiced" />
        <Bar dataKey="collected" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Collected" />
      </BarChart>
    </ResponsiveContainer>
  )
}
