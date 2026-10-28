import { cn } from '@/lib/utils'

interface InitialsAvatarProps {
  firstName: string
  lastName: string
  className?: string
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.trim()?.[0] ?? ''
  const last = lastName?.trim()?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

export function InitialsAvatar({ firstName, lastName, className }: InitialsAvatarProps) {
  const initials = getInitials(firstName, lastName)
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center rounded-full bg-muted font-medium text-xs select-none',
        className,
      )}
      aria-hidden="true"
    >
      <span className="leading-none">{initials}</span>
    </div>
  )
}
