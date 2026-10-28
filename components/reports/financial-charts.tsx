'use client'

import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Line,
  LineChart,
} from 'recharts'

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

// 1. Summary Bar Chart (Billed vs Paid)
export function FinancialSummaryChart({ data }: { data: any[] }) {
  const chartConfig = {
    total_billed: {
      label: 'Billed',
      color: 'hsl(var(--chart-1))',
    },
    total_paid: {
      label: 'Paid',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="billing_period_name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₱${value / 1000}k`}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="total_billed"
          fill="var(--color-total_billed)"
          radius={4}
        />
        <Bar dataKey="total_paid" fill="var(--color-total_paid)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

// 2. Revenue Breakdown Pie Chart
export function RevenuePieChart({ data }: { data: any[] }) {
  const chartConfig = data.reduce((acc, item, index) => {
    acc[item.fee_type_id] = {
      label: item.fee_type_name,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }
    return acc
  }, {} as ChartConfig)

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="total_billed"
          nameKey="fee_type_name"
          innerRadius={60}
          strokeWidth={5}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(var(--chart-${(index % 5) + 1}))`}
            />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="fee_type_name" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  )
}

// 3. Water Consumption Trend Line Chart
export function WaterConsumptionChart({ data }: { data: any[] }) {
  const chartConfig = {
    consumption: {
      label: 'Consumption (m³)',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="reading_date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
        />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Line
          dataKey="consumption"
          type="monotone"
          stroke="var(--color-consumption)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
