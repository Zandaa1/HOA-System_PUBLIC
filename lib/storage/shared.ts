const SUPABASE_PUBLIC_OBJECT_RE = /\/storage\/v1\/object\/public\/([^/]+)\//
const API_FILE_PATH_RE = /\/api\/files\?path=([^&]+)/

const STAFF_ONLY_PREFIXES = [
  'payments/',
  'liquidations/',
  'cash-advances/',
  'disbursements/',
  'finance/',
  'violations/',
]

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase()
  const dotIndex = trimmed.lastIndexOf('.')
  const rawBase = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed
  const rawExt = dotIndex > 0 ? trimmed.slice(dotIndex + 1) : ''

  const base = rawBase
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file'

  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 12)
  return ext ? `${base}.${ext}` : base
}

export function normalizeStoredPath(input: string): string {
  const extracted = extractStoredPath(input)
  const path = decodeURIComponent(extracted)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')

  if (!path || path.includes('\0')) {
    throw new Error('Invalid file path')
  }

  const segments = path.split('/')
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    throw new Error('Invalid file path')
  }

  return path
}

export function extractStoredPath(input: string): string {
  if (!input) return ''

  const apiMatch = input.match(API_FILE_PATH_RE)
  if (apiMatch?.[1]) return apiMatch[1]

  const publicObjectMatch = input.match(SUPABASE_PUBLIC_OBJECT_RE)
  if (publicObjectMatch) {
    const bucket = publicObjectMatch[1]
    const suffix = input.slice(input.indexOf(publicObjectMatch[0]) + publicObjectMatch[0].length)
    return bucket === 'attachments' ? suffix : `${bucket}/${suffix}`
  }

  return input
}

export function getFileUrl(path: string | null | undefined, options?: { download?: boolean }): string {
  if (!path) return ''
  const normalized = normalizeStoredPath(path)
  const params = new URLSearchParams({ path: normalized })
  if (options?.download) params.set('download', '1')
  return `/api/files?${params.toString()}`
}

export function getDisplayFileUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('/') && !path.startsWith('/api/files')) return path
  if (path.startsWith('http') && !SUPABASE_PUBLIC_OBJECT_RE.test(path)) return path
  return getFileUrl(path)
}

export function isStaffOnlyFilePath(path: string): boolean {
  const normalized = normalizeStoredPath(path)
  return STAFF_ONLY_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

export function isMaintenanceFilePath(path: string): boolean {
  return normalizeStoredPath(path).startsWith('maintenance/')
}

export function getDocumentStoredPath(path: string): string {
  const normalized = normalizeStoredPath(path)
  return normalized.startsWith('documents/') ? normalized : `documents/${normalized}`
}
