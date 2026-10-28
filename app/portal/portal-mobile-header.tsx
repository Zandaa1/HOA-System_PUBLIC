'use client'

import Link from 'next/link'
import { LogOut, Menu, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import type { Branding } from '@/lib/branding'
import { portalNavItems } from '@/lib/portal-nav'
import { InitialsAvatar } from '@/components/ui/initials-avatar'

interface PortalMobileHeaderProps {
  branding: Branding
  residentName: string
  residentFirstName: string
  residentLastName: string
  residentLocation: string
  logoutAction: () => Promise<void>
}

export function PortalMobileHeader({
  branding,
  residentName,
  residentFirstName,
  residentLastName,
  residentLocation,
  logoutAction,
}: PortalMobileHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:hidden print:hidden">
      <Link href="/portal" className="flex items-center gap-2 text-foreground">
        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Building2 className="size-5" />
        </div>
        <div className="grid flex-1 text-left text-xs leading-tight">
          <span className="font-bold text-sm tracking-tight">{branding.hoaName}</span>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold">Management Platform</span>
        </div>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="size-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <nav className="grid gap-2 text-lg font-medium">
            {portalNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t pt-4">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <InitialsAvatar
                firstName={residentFirstName}
                lastName={residentLastName}
                className="size-9 shrink-0"
              />
              <div>
                <p>{residentName}</p>
                <p className="text-xs text-muted-foreground">
                  {residentLocation}
                </p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button
                variant="ghost"
                type="submit"
                className="mt-4 w-full justify-start text-muted-foreground hover:text-primary"
              >
                <LogOut className="mr-3 size-5" />
                Logout
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
