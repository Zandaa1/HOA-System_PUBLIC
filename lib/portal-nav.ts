import {
  Home,
  Receipt,
  FileText,
  Users,
  Settings,
  Wrench,
  Hammer,
  Vote,
  type LucideIcon,
} from 'lucide-react'

export interface PortalNavItem {
  href: string
  icon: LucideIcon
  label: string
}

export const portalNavItems: PortalNavItem[] = [
  { href: '/portal', icon: Home, label: 'Dashboard' },
  { href: '/portal/billing', icon: Receipt, label: 'Billing' },
  { href: '/portal/permits', icon: Hammer, label: 'Permits' },
  { href: '/portal/voting', icon: Vote, label: 'Voting' },
  { href: '/portal/documents', icon: FileText, label: 'Documents' },
  { href: '/portal/directory', icon: Users, label: 'Directory' },
  { href: '/portal/maintenance', icon: Wrench, label: 'Maintenance' },
  { href: '/portal/settings', icon: Settings, label: 'Settings' },
]
