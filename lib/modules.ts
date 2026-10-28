export interface Module {
  key: string
  label: string
  description: string
  isEssential: boolean
  /** IDs of dashboard widgets this module contributes */
  dashboardWidgets: string[]
  /** Nav route prefixes to hide when disabled */
  navRoutes: string[]
}

export const MODULES: Module[] = [
  {
    key: 'enable_amenities',
    label: 'Amenities',
    description: 'Amenity facilities, bookings, and calendar',
    isEssential: false,
    dashboardWidgets: ['pending_bookings', 'booking_calendar', 'booking_quick_action'],
    navRoutes: ['/dashboard/amenities'],
  },
  {
    key: 'enable_water_billing',
    label: 'Water Metering & Billing',
    description: 'Water meter readings and billing',
    isEssential: false,
    dashboardWidgets: ['water_consumption', 'water_kpi'],
    navRoutes: ['/dashboard/water'],
  },
  {
    key: 'enable_violations',
    label: 'Violations',
    description: 'Violation tracking and notices',
    isEssential: false,
    dashboardWidgets: ['violation_alerts'],
    navRoutes: ['/dashboard/violations'],
  },
  {
    key: 'enable_maintenance',
    label: 'Maintenance',
    description: 'Maintenance request management',
    isEssential: false,
    dashboardWidgets: ['maintenance_quick_action'],
    navRoutes: ['/dashboard/maintenance'],
  },
  {
    key: 'enable_gate',
    label: 'Gate Entry',
    description: 'Gate entry log',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/gate'],
  },
  {
    key: 'enable_documents',
    label: 'Documents',
    description: 'Document management and storage',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/documents'],
  },
  {
    key: 'enable_bank_accounts',
    label: 'Bank Accounts',
    description: 'Bank account tracking',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/finance/bank-accounts'],
  },
  {
    key: 'enable_cash_advances',
    label: 'Cash Advances & PCF',
    description: 'Cash advance and petty cash fund management',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/billing/cash-advances', '/dashboard/billing/pcf'],
  },
  {
    key: 'enable_disbursements',
    label: 'Disbursements',
    description: 'Expense disbursements',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/finance/disbursements', '/dashboard/billing/disbursements'],
  },
  {
    key: 'enable_finance',
    label: 'Finance Workspace',
    description: 'Invoices, collections, expenses, cash flow, and bank records',
    isEssential: false,
    dashboardWidgets: [],
    navRoutes: ['/dashboard/finance', '/dashboard/billing'],
  },
]

export interface AccessGroup {
  key: string
  label: string
  description: string
  routes: string[]
}

export const ACCESS_GROUPS: AccessGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Dashboard summary and daily office queue',
    routes: ['/dashboard'],
  },
  {
    key: 'properties',
    label: 'Properties',
    description: 'Property records, map, property types, and transfers',
    routes: ['/dashboard/properties', '/dashboard/map'],
  },
  {
    key: 'residents',
    label: 'Residents',
    description: 'Homeowner and renter records',
    routes: ['/dashboard/residents'],
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    description: 'Vehicle registry and sticker records',
    routes: ['/dashboard/vehicles'],
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Invoices, payments, collections, expenses, banks, and cash flow',
    routes: ['/dashboard/finance', '/dashboard/billing'],
  },
  {
    key: 'amenities',
    label: 'Amenities',
    description: 'Facilities, bookings, and calendar',
    routes: ['/dashboard/amenities'],
  },
  {
    key: 'water',
    label: 'Water',
    description: 'Water meters, readings, and utility billing',
    routes: ['/dashboard/water'],
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Community notices and alerts',
    routes: ['/dashboard/announcements'],
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'Document storage and resident files',
    routes: ['/dashboard/documents'],
  },
  {
    key: 'violations',
    label: 'Violations',
    description: 'Violation records and notices',
    routes: ['/dashboard/violations'],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Maintenance requests and vendors',
    routes: ['/dashboard/maintenance'],
  },
  {
    key: 'gate',
    label: 'Gate',
    description: 'Gate security and entry verification',
    routes: ['/dashboard/gate'],
  },
  {
    key: 'staff_access',
    label: 'Staff & Access',
    description: 'Staff accounts and access checklists',
    routes: ['/dashboard/admin/staff', '/dashboard/admin/roles'],
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'System settings and directory configuration',
    routes: ['/dashboard/settings'],
  },
  {
    key: 'audit_backup',
    label: 'Audit & Backup',
    description: 'Audit log, backups, and exports',
    routes: ['/dashboard/admin/audit-log', '/dashboard/admin/backup'],
  },
]

export const ESSENTIAL_MODULE_KEYS = new Set(
  MODULES.filter((m) => m.isEssential).map((m) => m.key),
)

export function isModuleEnabled(
  settings: Array<{ setting_key: string; setting_value: string | null }>,
  moduleKey: string,
): boolean {
  const setting = settings.find((s) => s.setting_key === moduleKey)
  if (!setting) return true // default enabled
  return setting.setting_value !== 'false'
}

export function getEnabledModules(
  settings: Array<{ setting_key: string; setting_value: string | null }>,
): Set<string> {
  const enabled = new Set<string>()
  for (const module of MODULES) {
    if (module.isEssential || isModuleEnabled(settings, module.key)) {
      enabled.add(module.key)
    }
  }
  return enabled
}

export function getDisabledModules(
  settings: Array<{ setting_key: string; setting_value: string | null }>,
): Module[] {
  return MODULES.filter((m) => !m.isEssential && !isModuleEnabled(settings, m.key))
}

/**
 * Maps a route path to the module key that controls access to that area.
 * Essential routes (properties, residents, billing core, admin, settings)
 * return undefined — they are always accessible to active staff.
 */
export function routeToModuleKey(href: string): string | undefined {
  // Check toggleable module routes first (order matters — more specific first)
  for (const mod of MODULES) {
    if (mod.navRoutes.some((r) => href.startsWith(r))) {
      return mod.key
    }
  }
  return undefined
}

export function routeToAccessKey(href: string): string | undefined {
  if (href === '/dashboard') return 'overview'

  const sorted = [...ACCESS_GROUPS]
    .flatMap((group) => group.routes.map((route) => ({ key: group.key, route })))
    .sort((a, b) => b.route.length - a.route.length)

  const match = sorted.find(({ route }) => href === route || href.startsWith(`${route}/`))
  return match?.key
}

/**
 * Resolve effective permissions for a staff member.
 * Returns a Set of enabled module keys, plus an `all` boolean.
 */
export interface StaffPermissions {
  all: boolean
  modules: string[]
}

export function resolveStaffPermissions(
  staffPermissions?: Record<string, boolean> | null,
): StaffPermissions {
  const moduleSet = new Set<string>()
  const all = !!staffPermissions?.all

  if (staffPermissions) {
    for (const [key, val] of Object.entries(staffPermissions)) {
      if (key === 'all') continue
      if (val) moduleSet.add(key)
    }
  }

  return { all, modules: Array.from(moduleSet) }
}

/**
 * Check whether a staff member (with resolved permissions) can access a route.
 * Essential routes are always allowed. Toggleable module routes require either
 * `all` access or the specific module key in the permissions set.
 */
export function hasRouteAccess(
  href: string,
  permissions: StaffPermissions,
): boolean {
  if (permissions.all) return true
  const accessKey = routeToAccessKey(href)
  if (!accessKey) return true
  return permissions.modules.includes(accessKey)
}

/**
 * Check whether the current staff member can see a given permission category
 * in the UI (backward-compat with the 7-boolean shape used in some places).
 */
export function hasPermissionCategory(
  _href: string,
  _permissions: any,
): boolean {
  // Simple delegation — all real checks go through hasRouteAccess now
  return true
}
