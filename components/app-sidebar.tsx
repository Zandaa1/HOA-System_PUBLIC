'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Home,
  Users,
  Calendar,
  Droplets,
  Settings,
  Map as MapIcon,
  Car,
  UserCog,
  ChevronDown,
  LogOut,
  ListChecks,
  ShieldCheck,
  DatabaseBackup,
  ScrollText,
  ShieldAlert,
  Wrench,
  Megaphone,
  FolderOpen,
  Landmark,
  Search,
  X,
  Hammer,
  Vote,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MODULES, isModuleEnabled, hasRouteAccess } from '@/lib/modules'
import { getBranding } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { InitialsAvatar } from '@/components/ui/initials-avatar'

interface NavItem {
  title: string
  href: string
  icon?: any
}

interface NavGroupItem {
  title: string
  icon: any
  items: NavItem[]
  /** Open the dropdown by default even if no child matches the current path */
  defaultExpanded?: boolean
}

type NavigationItem = NavItem | NavGroupItem

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: Home },
      { title: 'Property Map', href: '/dashboard/map', icon: MapIcon },
    ],
  },
  {
    label: 'Property Management',
    items: [
      {
        title: 'Properties',
        icon: Building2,
        items: [
          { title: 'All Properties', href: '/dashboard/properties' },
          { title: 'Property Types', href: '/dashboard/properties/types' },
        ],
      },
      {
        title: 'Residents',
        icon: Users,
        items: [
          { title: 'Homeowners', href: '/dashboard/residents/homeowners' },
          { title: 'Renters', href: '/dashboard/residents/renters' },
        ],
      },
      { title: 'Vehicles', href: '/dashboard/vehicles', icon: Car },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        title: 'Finance',
        icon: Landmark,
        defaultExpanded: true,
        items: [
          { title: 'Overview', href: '/dashboard/finance' },
          { title: 'Invoices', href: '/dashboard/billing/invoices' },
          { title: 'Collections', href: '/dashboard/billing/collections' },
          { title: 'Expenses', href: '/dashboard/finance/disbursements' },
          { title: 'Bank Accounts', href: '/dashboard/finance/bank-accounts' },
          { title: 'Cash Flow', href: '/dashboard/finance/cash-flow' },
          { title: 'Finance Settings', href: '/dashboard/billing/fee-types' },
        ],
      },
    ],
  },
  {
    label: 'Amenities & Utilities',
    items: [
      { title: 'Amenities', href: '/dashboard/amenities', icon: Building2 },
      { title: 'Calendar', href: '/dashboard/amenities/calendar', icon: Calendar },
      { title: 'Bookings', href: '/dashboard/amenities/bookings', icon: ListChecks },
      { title: 'Water Metering', href: '/dashboard/water', icon: Droplets },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
      { title: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
      { title: 'Violations', href: '/dashboard/violations', icon: ShieldAlert },
      { title: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
      { title: 'Permits', href: '/dashboard/permits', icon: Hammer },
      { title: 'Elections', href: '/dashboard/elections', icon: Vote },
      { title: 'Gate Entry', href: '/dashboard/gate', icon: ShieldCheck },
    ],
  },
  {
    label: 'Administration',
    items: [
      { title: 'Staff & Access', href: '/dashboard/admin/staff', icon: UserCog },
      { title: 'Audit Log', href: '/dashboard/admin/audit-log', icon: ScrollText },
      { title: 'Backup & Export', href: '/dashboard/admin/backup', icon: DatabaseBackup },
      {
        title: 'Settings',
        icon: Settings,
        items: [
          { title: 'General', href: '/dashboard/settings' },
          { title: 'Directory', href: '/dashboard/settings/contacts' },
        ],
      },
    ],
  },
]

interface AppSidebarProps {
  permissions?: {
    all: boolean
    modules: string[]
  }
  settings?: { setting_key: string; setting_value: string }[]
  isDeveloper?: boolean
  staff?: {
    first_name: string
    last_name: string
    email: string
    position: string | null
  }
}

export function AppSidebar({ permissions, settings, isDeveloper = false, staff }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const [filterQuery, setFilterQuery] = useState('')

  const matchesFilter = (text: string) => {
    if (!filterQuery.trim()) return true
    return text.toLowerCase().includes(filterQuery.toLowerCase())
  }

  const userPerms = permissions || { all: false, modules: [] }

  // Build module → routes map for filtering
  const moduleRouteMap = new Map<string, RegExp[]>()
  for (const mod of MODULES) {
    moduleRouteMap.set(mod.key, mod.navRoutes.map((r) => new RegExp(`^${r}`)))
  }
  const isModEnabled = (href: string) => {
    for (const [modKey, patterns] of moduleRouteMap) {
      if (patterns.some((p) => p.test(href))) {
        return isModuleEnabled(settings || [], modKey)
      }
    }
    return true
  }

  const branding = getBranding(settings || [])

  const filteredGroups = navigationGroups.map((group) => {
    const filteredItems = group.items.map((item) => {
      const isGroup = 'items' in item
      if (isGroup) {
        const groupItem = item as NavGroupItem
        const filteredSubItems = groupItem.items.filter((subItem) => {
          if (!isModEnabled(subItem.href)) return false
          if (!hasRouteAccess(subItem.href, userPerms)) return false
          if (filterQuery && !matchesFilter(subItem.title) && !matchesFilter(groupItem.title)) return false
          return true
        })
        if (filteredSubItems.length === 0) return null
        return {
          ...groupItem,
          items: filteredSubItems,
        }
      } else {
        const singleItem = item as NavItem
        
        if (!isModEnabled(singleItem.href)) return null
        
        if (!hasRouteAccess(singleItem.href, userPerms)) return null

        if (filterQuery && !matchesFilter(singleItem.title)) return null
        
        return singleItem
      }
    }).filter(Boolean) as NavigationItem[]

    if (filterQuery && filteredItems.length === 0) {
      return null
    }

    return {
      ...group,
      items: filteredItems,
    }
  }).filter((group): group is NonNullable<typeof group> => group !== null && group.items.length > 0)

  const sidebar = useSidebar()

  return (
    <Sidebar collapsible="icon" data-hydrated={isHydrated}>
      <SidebarHeader>
        {/* Claude-style: branding on the left, toggle button on the top-right */}
        <div className="flex items-center justify-between">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{branding.hoaName}</span>
                    <span className="truncate text-xs text-muted-foreground">Management System</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {/* Toggle button — visible in expanded state only; in collapsed state the icon rail shows it via group-data */}
          <SidebarTrigger className="ml-1 shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
        {/* In collapsed/icon mode: show the toggle at the top of the icon rail */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center pt-1">
          <SidebarTrigger />
        </div>
        {/* Search/filter input — only visible when expanded */}
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/50 pointer-events-none" />
            <Input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter menu..."
              className="h-8 pl-7 pr-7 text-xs bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus-visible:ring-1 focus-visible:ring-sidebar-ring"
              aria-label="Filter navigation menu"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
                aria-label="Clear filter"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>
        {filterQuery && filteredGroups.length === 0 && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            No matches
          </div>
        )}
      </SidebarHeader>
      <SidebarContent role="navigation" aria-label="Dashboard navigation">
        {(() => {
          let flatIndex = 0
          return filteredGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isGroup = 'items' in item
                    flatIndex++
                    const animationClass = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-300 fill-mode-both"
                    
                    if (isGroup) {
                      const groupItem = item as NavGroupItem
                      const isActive = groupItem.items.some((subItem) =>
                        pathname.startsWith(subItem.href)
                      )

                      if (!sidebar.open) {
                        return (
                          <SidebarMenuItem
                            key={groupItem.title}
                            className={animationClass}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuButton tooltip={groupItem.title}>
                                  <groupItem.icon className="size-4" />
                                  <span>{groupItem.title}</span>
                                </SidebarMenuButton>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="right" align="start" className="min-w-40">
                                {groupItem.items.map((subItem) => (
                                  <DropdownMenuItem key={subItem.href} asChild>
                                    <Link href={subItem.href}>{subItem.title}</Link>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuItem>
                        )
                      }

                      return (
                        <Collapsible
                          key={groupItem.title}
                          asChild
                          defaultOpen={isActive || groupItem.defaultExpanded === true}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem
                            className={animationClass}
                          >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={groupItem.title}>
                                <groupItem.icon className="size-4" />
                                <span>{groupItem.title}</span>
                                <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {groupItem.items.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.href}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname === subItem.href}
                                    >
                                      <Link href={subItem.href}>
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    }

                    const singleItem = item as NavItem
                    return (
                      <SidebarMenuItem
                        key={singleItem.href}
                        className={animationClass}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === singleItem.href}
                          tooltip={singleItem.title}
                        >
                          <Link href={singleItem.href}>
                            {singleItem.icon && <singleItem.icon className="size-4" />}
                            <span>{singleItem.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        })()}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  title={staff ? `${staff.first_name} ${staff.last_name}` : 'Account'}
                >
                  <InitialsAvatar
                    firstName={staff?.first_name ?? ''}
                    lastName={staff?.last_name ?? ''}
                    className="size-6"
                  />
                  <div className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="truncate text-sm">
                      {staff ? `${staff.first_name} ${staff.last_name}` : 'Account'}
                    </span>
                    {(staff?.position || staff?.email) && (
                      <span className="truncate text-xs text-muted-foreground">
                        {staff.position || staff.email}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                {isDeveloper && (
                  <DropdownMenuItem asChild>
                    <Link href="/developer" className="flex items-center gap-2 w-full cursor-pointer">
                      <ShieldCheck className="size-4 text-primary" />
                      <span>Developer Portal</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
