/**
 * Date formatting helpers for HOA System.
 *
 * All helpers use the Asia/Manila timezone (per AGENTS.md) and `en-PH` locale
 * so that server-rendered output matches client-rendered output and avoids
 * hydration warnings on tables. Per AGENTS.md, dates render as
 * "DD Month YYYY" (e.g. "07 June 2026").
 */

const TIMEZONE = 'Asia/Manila'
const LOCALE = 'en-PH'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function getParts(
  d: Date,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') === 24 ? 0 : get('hour'),
    minute: get('minute'),
  }
}

export function formatDate(
  value: Date | string | number | null | undefined,
  options: { fallback?: string } = {},
): string {
  const d = toDate(value)
  if (!d) return options.fallback ?? '—'
  const { year, month, day } = getParts(d)
  return `${pad2(day)} ${MONTHS[month - 1]} ${year}`
}

export function formatDateTime(
  value: Date | string | number | null | undefined,
  options: { fallback?: string } = {},
): string {
  const d = toDate(value)
  if (!d) return options.fallback ?? '—'
  const { year, month, day, hour, minute } = getParts(d)
  return `${pad2(day)} ${MONTHS[month - 1]} ${year} ${pad2(hour)}:${pad2(minute)}`
}

export function formatMonthYear(
  value: Date | string | number | null | undefined,
  options: { fallback?: string } = {},
): string {
  const d = toDate(value)
  if (!d) return options.fallback ?? '—'
  const { year, month } = getParts(d)
  return `${MONTHS[month - 1]} ${year}`
}

export function formatMonthDay(
  value: Date | string | number | null | undefined,
  options: { fallback?: string } = {},
): string {
  const d = toDate(value)
  if (!d) return options.fallback ?? '—'
  const { month, day } = getParts(d)
  return `${pad2(day)} ${MONTHS_SHORT[month - 1]}`
}

export function formatRelative(
  value: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  const d = toDate(value)
  if (!d) return '—'
  const nowParts = getParts(now)
  const valueParts = getParts(d)
  const nowMs = Date.UTC(
    nowParts.year,
    nowParts.month - 1,
    nowParts.day,
    nowParts.hour,
    nowParts.minute,
  )
  const valueMs = Date.UTC(
    valueParts.year,
    valueParts.month - 1,
    valueParts.day,
    valueParts.hour,
    valueParts.minute,
  )
  const diffMs = valueMs - nowMs
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHr = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHr / 24)
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour')
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')
  if (Math.abs(diffDay) < 365) return rtf.format(Math.round(diffDay / 30), 'month')
  return rtf.format(Math.round(diffDay / 365), 'year')
}
