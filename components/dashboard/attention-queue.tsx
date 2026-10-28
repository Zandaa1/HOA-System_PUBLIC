import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  Calendar,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

export interface AttentionItem {
  id: string
  href: string
  title: string
  subtitle: string
  meta?: string
}

export interface AttentionSection {
  key: string
  label: string
  icon: LucideIcon
  items: AttentionItem[]
  viewAllHref?: string
  emptyHint?: string
}

interface AttentionQueueProps {
  sections: AttentionSection[]
}

export function AttentionQueue({ sections }: AttentionQueueProps) {
  const visible = sections.filter((s) => s.items.length > 0)
  const totalCount = visible.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <Card className="border-border/60 bg-card shadow-sm h-full">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Attention Queue
          </CardTitle>
          {totalCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
              {totalCount} item{totalCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Items that need a human decision</p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <CheckCircle2 className="size-8 text-emerald-500 opacity-70" />
            <p className="text-sm font-semibold text-foreground">All clear</p>
            <p className="text-xs text-muted-foreground">No pending actions right now.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((section) => {
              const Icon = section.icon
              return (
                <li key={section.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {section.label}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                        ({section.items.length})
                      </span>
                    </div>
                    {section.viewAllHref && (
                      <Link
                        href={section.viewAllHref}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        View all
                      </Link>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/60 transition-colors duration-150"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate group-hover:text-primary transition-colors">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                          {item.meta && (
                            <span className="text-xs font-bold tabular-nums text-foreground/80 shrink-0">
                              {item.meta}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
