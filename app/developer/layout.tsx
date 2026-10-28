
import { RouteMotion } from '@/components/route-motion'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 text-on-background flex flex-col font-sans">
      <header className="flex h-14 items-center justify-between border-b bg-surface px-6 shadow-sm">
        <div className="flex items-center gap-2.5 font-semibold">
          <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">HOA System · Developer Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1">
            <Link href="/dashboard">
              <ArrowLeft className="size-3.5" /> Back to Staff Dashboard
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <RouteMotion className="min-h-full">
          {children}
        </RouteMotion>
      </main>
    </div>
  )
}
