interface OccupancyRingProps {
  byStatus: Record<string, number>
  total: number
}

const STATUS_ORDER: Array<{ key: string; label: string; var: string }> = [
  { key: 'occupied', label: 'Occupied', var: 'var(--status-paid)' },
  { key: 'occupied_renter', label: 'Occupied (Renter)', var: 'var(--status-partial)' },
  { key: 'vacant', label: 'Vacant', var: 'var(--status-inactive)' },
  { key: 'for_sale', label: 'For Sale', var: 'var(--status-partial)' },
  { key: 'for_rent', label: 'For Rent', var: 'var(--status-pending)' },
]

export function OccupancyRing({ byStatus, total }: OccupancyRingProps) {
  const size = 120
  const stroke = 14
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  // Merge occupied + occupied_renter for the donut, but keep separate in the legend
  const merged: Record<string, number> = {}
  for (const s of STATUS_ORDER) {
    merged[s.key] = byStatus[s.key] || 0
  }
  const occupiedMerged = (merged.occupied || 0) + (merged.occupied_renter || 0)

  const segments = [
    { label: 'Occupied (incl. renters)', value: occupiedMerged, var: 'var(--status-paid)' },
    { label: 'Vacant', value: merged.vacant || 0, var: 'var(--status-inactive)' },
    { label: 'For Sale', value: merged.for_sale || 0, var: 'var(--status-partial)' },
    { label: 'For Rent', value: merged.for_rent || 0, var: 'var(--status-pending)' },
  ].filter((s) => s.value > 0)

  if (total === 0) {
    return (
      <div className="text-sm text-muted-foreground italic text-center py-8">
        No properties registered yet.
      </div>
    )
  }

  let offset = 0
  const occupancyRate = total > 0 ? Math.round((occupiedMerged / total) * 100) : 0

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => {
            const length = (seg.value / total) * circumference
            const dasharray = `${length} ${circumference - length}`
            const dashoffset = -offset
            offset += length
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.var}
                strokeWidth={stroke}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="butt"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tracking-tight tabular-nums">{occupancyRate}%</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Occupied
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-xs">
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0
          return (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.var }}
                  aria-hidden
                />
                <span className="truncate text-foreground/80">{seg.label}</span>
              </span>
              <span className="tabular-nums text-muted-foreground font-medium shrink-0">
                {seg.value} · {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
