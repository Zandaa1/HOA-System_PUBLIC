import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'

export interface KpiItem {
  label: string
  value: string
  href: string
  icon: LucideIcon
  accent?: 'default' | 'primary' | 'warning' | 'danger' | 'success'
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; hint?: string }
}

interface KpiStripProps {
  items: KpiItem[]
}

const ACCENT_RING: Record<NonNullable<KpiItem['accent']>, string> = {
  default: 'border-border/60 hover:border-foreground/30',
  primary: 'border-primary/30 hover:border-primary/50',
  warning: 'border-amber-500/30 hover:border-amber-500/50',
  danger: 'border-red-500/30 hover:border-red-500/50',
  success: 'border-emerald-500/30 hover:border-emerald-500/50',
}

const ACCENT_ICON: Record<NonNullable<KpiItem['accent']>, string> = {
  default: 'text-foreground/70',
  primary: 'text-primary',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  success: 'text-emerald-600',
}

const ACCENT_VALUE: Record<NonNullable<KpiItem['accent']>, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  success: 'text-emerald-600',
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => {
        const accent = item.accent || 'default'
        const Icon = item.icon
        const DeltaIcon =
          item.delta?.direction === 'up'
            ? ArrowUpRight
            : item.delta?.direction === 'down'
              ? ArrowDownRight
              : Minus
        const deltaColor =
          item.delta?.direction === 'up'
            ? 'text-emerald-600'
            : item.delta?.direction === 'down'
              ? 'text-red-600'
              : 'text-muted-foreground'
        return (
          <Link key={item.label} href={item.href} className="group">
            <Card
              className={cn(
                'h-full bg-card shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-200',
                ACCENT_RING[accent],
              )}
            >
              <CardContent className="px-5 py-4 flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <Icon className={cn('size-4 opacity-80', ACCENT_ICON[accent])} />
                </div>
                <div
                  className={cn(
                    'text-2xl font-extrabold tracking-tight tabular-nums leading-none mt-1',
                    ACCENT_VALUE[accent],
                  )}
                >
                  {item.value}
                </div>
                {item.delta && (
                  <div className={cn('flex items-center gap-1 text-[11px] font-semibold', deltaColor)}>
                    <DeltaIcon className="size-3" />
                    <span className="tabular-nums">{item.delta.value}</span>
                    {item.delta.hint && (
                      <span className="text-muted-foreground font-normal ml-1">{item.delta.hint}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
