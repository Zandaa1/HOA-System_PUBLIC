interface DashboardGreetingProps {
  propertiesCount: number
  ownersCount: number
  enabledModulesCount: number
}

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formattedDate(): string {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(new Date())
  } catch {
    return new Date().toDateString()
  }
}

export function DashboardGreeting({
  propertiesCount,
  ownersCount,
  enabledModulesCount,
}: DashboardGreetingProps) {
  return (
    <div
      className="-mx-6 -mt-6 mb-6 px-6 py-6 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border-b border-border/60"
      suppressHydrationWarning
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {timeGreeting()}
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {formattedDate()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContextChip label="Properties" value={propertiesCount} />
          <ContextChip label="Owners" value={ownersCount} />
          <ContextChip label="Modules" value={enabledModulesCount} />
        </div>
      </div>
    </div>
  )
}

function ContextChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm">
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
    </span>
  )
}
