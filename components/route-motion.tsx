'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type RouteMotionProps = {
  children: ReactNode
  className?: string
}

export function RouteMotion({ children, className }: RouteMotionProps) {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both motion-reduce:animate-none motion-reduce:transform-none',
        className
      )}
    >
      {children}
    </div>
  )
}
