'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
  showBreadcrumb?: boolean
  breadcrumbLabels?: Record<string, string>
}

const DEFAULT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  portal: 'Portal',
  properties: 'Properties',
  residents: 'Residents',
  billing: 'Billing',
  amenities: 'Amenities',
  vehicles: 'Vehicles',
  violations: 'Violations',
  maintenance: 'Maintenance',
  finance: 'Finance',
  reports: 'Reports',
  admin: 'Administration',
  announcements: 'Announcements',
  documents: 'Documents',
  water: 'Water',
  setup: 'Setup',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  bookings: 'Bookings',
  calendar: 'Calendar',
  payments: 'Payments',
  invoices: 'Invoices',
  periods: 'Periods',
  pcf: 'PCF',
  homeowners: 'Homeowners',
  renters: 'Renters',
  types: 'Types',
  transfers: 'Transfers',
  staff: 'Staff',
  roles: 'Roles',
  custom: 'Custom',
  fields: 'Fields',
  audit: 'Audit',
  log: 'Log',
  backup: 'Backup',
  contacts: 'Contacts',
  force: 'Force',
  reset: 'Reset',
  categories: 'Categories',
  collections: 'Collections',
  disbursements: 'Disbursements',
  bank: 'Bank',
  accounts: 'Accounts',
  cash: 'Cash',
  advances: 'Advances',
  advance: 'Advance',
  deposits: 'Deposits',
  read: 'Read',
  readings: 'Readings',
  meters: 'Meters',
  meter: 'Meter',
  batch: 'Batch',
  vendors: 'Vendors',
  fee: 'Fee',
  directory: 'Directory',
}

function humanize(segment: string, labels?: Record<string, string>): string {
  if (labels?.[segment]) return labels[segment]
  if (DEFAULT_LABELS[segment]) return DEFAULT_LABELS[segment]
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return 'Detail'
  if (/^\d+$/.test(segment)) return `#${segment}`
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

export function PageHeader({
  title,
  description,
  action,
  className,
  children,
  showBreadcrumb = false,
  breadcrumbLabels,
  ...props
}: PageHeaderProps) {
  const pathname = usePathname()

  const buildCrumbs = () => {
    if (!pathname) return []
    const segments = pathname.split('/').filter(Boolean)
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      return { segment, href, isLast: index === segments.length - 1 }
    })
  }

  const crumbs = showBreadcrumb ? buildCrumbs() : []

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between -mx-6 -mt-6 mb-8 px-6 pt-6 pb-8 border-b border-border/60',
        className
      )}
      {...props}
    >
      <div className="grid gap-2 flex-1 min-w-0">
        {showBreadcrumb && crumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage>{humanize(crumb.segment, breadcrumbLabels)}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{humanize(crumb.segment, breadcrumbLabels)}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="flex items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold tracking-tight leading-tight text-primary truncate">
            {title}
          </h1>
          {children && (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground font-medium">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
