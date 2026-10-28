export type LoginErrorStage = 'branding' | 'signInWithPassword' | 'staffLookup' | 'updateUserMetadata'

export type LoginErrorLogInput = {
  stage?: unknown
  email?: unknown
  supabaseUrl?: unknown
  appUrl?: unknown
  elapsedMs?: unknown
  timestamp?: unknown
  error?: unknown
  client?: unknown
}

export type LoginErrorLogPayload = {
  stage: LoginErrorStage
  timestamp: string
  elapsedMs?: number
  emailMasked?: string
  emailDomain?: string
  errorName?: string
  errorMessage?: string
  errorStack?: string
  appUrl?: string
  appHost?: string
  supabaseHost?: string
  userAgent?: string
  language?: string
  platform?: string
  onLine?: boolean
}

const LOGIN_ERROR_STAGES = new Set<LoginErrorStage>([
  'branding',
  'signInWithPassword',
  'staffLookup',
  'updateUserMetadata',
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function truncate(value: unknown, maxLength: number): string | undefined {
  const stringValue = asString(value)?.trim()
  if (!stringValue) return undefined
  return stringValue.length > maxLength ? stringValue.slice(0, maxLength) : stringValue
}

function normalizeStage(stage: unknown): LoginErrorStage {
  return LOGIN_ERROR_STAGES.has(stage as LoginErrorStage) ? (stage as LoginErrorStage) : 'signInWithPassword'
}

function getHost(value: unknown): string | undefined {
  const url = truncate(value, 1000)
  if (!url) return undefined

  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

function normalizeAppUrl(value: unknown): string | undefined {
  const url = truncate(value, 1000)
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return undefined
  }
}

function maskEmail(value: unknown): { emailMasked?: string; emailDomain?: string } {
  const email = asString(value)?.trim().toLowerCase()
  if (!email || !email.includes('@')) return {}

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return {}

  return {
    emailMasked: `${localPart.slice(0, 1)}***@${domain}`,
    emailDomain: domain,
  }
}

function normalizeElapsedMs(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.round(Math.min(value, 60_000))
}

function normalizeTimestamp(value: unknown): string {
  const timestamp = asString(value)
  if (timestamp) {
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return new Date().toISOString()
}

export function buildLoginErrorLogPayload(input: LoginErrorLogInput): LoginErrorLogPayload {
  const error = asRecord(input.error)
  const client = asRecord(input.client)
  const email = maskEmail(input.email)
  const appUrl = normalizeAppUrl(input.appUrl)

  return {
    stage: normalizeStage(input.stage),
    timestamp: normalizeTimestamp(input.timestamp),
    elapsedMs: normalizeElapsedMs(input.elapsedMs),
    ...email,
    errorName: truncate(error.name, 80),
    errorMessage: truncate(error.message, 500),
    errorStack: truncate(error.stack, 500),
    appUrl,
    appHost: getHost(input.appUrl),
    supabaseHost: getHost(input.supabaseUrl),
    userAgent: truncate(client.userAgent, 500),
    language: truncate(client.language, 80),
    platform: truncate(client.platform, 80),
    onLine: typeof client.onLine === 'boolean' ? client.onLine : undefined,
  }
}

export function isAllowedLoginErrorOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true
  if (!host) return false

  try {
    const originHost = new URL(origin).hostname
    const requestHost = host.split(':')[0]
    return originHost === requestHost
  } catch {
    return false
  }
}
