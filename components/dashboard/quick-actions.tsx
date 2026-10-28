'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FileText,
  CreditCard,
  CalendarPlus,
  CarFront,
  Zap,
  Megaphone,
  Building2,
  type LucideIcon,
} from 'lucide-react'

export type QuickActionIcon =
  | 'invoice'
  | 'payment'
  | 'booking'
  | 'vehicle'
  | 'dues'
  | 'announcement'
  | 'property'

const ICON_MAP: Record<QuickActionIcon, LucideIcon> = {
  invoice: FileText,
  payment: CreditCard,
  booking: CalendarPlus,
  vehicle: CarFront,
  dues: Zap,
  announcement: Megaphone,
  property: Building2,
}

export interface QuickAction {
  label: string
  href: string
  icon: QuickActionIcon
  color: string
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  if (actions.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {actions.map((a, i) => {
        const Icon = ICON_MAP[a.icon]
        return (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            asChild
            className={cn(
              'h-auto flex-col py-4 px-3 gap-2 text-xs hover:bg-primary/[0.03] hover:text-primary hover:border-primary/40 transition-[background-color,border-color,box-shadow] duration-200 border-border/60 shadow-none hover:shadow-sm',
              'motion-safe:animate-fade-up fill-mode-both',
            )}
          >
            <Link href={a.href} className="flex flex-col items-center gap-2 w-full">
              <Icon className={cn('size-5 opacity-90', a.color)} />
              <span className="leading-tight text-center font-semibold tracking-tight">
                {a.label}
              </span>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
