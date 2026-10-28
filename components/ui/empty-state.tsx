import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const hasAction = action || (actionLabel && actionHref)

  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl bg-card border-muted/80 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 min-h-[320px]', className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/5 text-primary mb-4">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Button asChild className="mt-6 h-9 px-4" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button className="mt-6 h-9 px-4" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
      {!action && actionLabel && actionHref && (
        <Button asChild className="mt-6 h-9 px-4" size="sm">
          <Link href={actionHref}>
            <Plus className="mr-2 size-4" />
            {actionLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}
