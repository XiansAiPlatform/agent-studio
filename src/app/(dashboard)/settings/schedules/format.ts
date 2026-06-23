/** Formatting helpers for schedule timestamps. */

/** A sentinel the backend may use for "never"/unset DateTime values. */
function isUnsetDate(date: Date): boolean {
  // Year <= 1 indicates a default/unset .NET DateTime serialized to ISO.
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1
}

/** Absolute, human-readable local date-time (e.g. "Jun 22, 2026, 9:53 PM"). */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (isUnsetDate(date)) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Like {@link formatDateTime} but includes seconds. Used for run rows where
 * executions can be only seconds apart and would otherwise look identical.
 */
export function formatDateTimeWithSeconds(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (isUnsetDate(date)) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Relative time from now (e.g. "in 3 hours", "2 days ago"). */
export function formatRelative(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (isUnsetDate(date)) return null

  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const second = 1_000
  const minute = 60 * second
  const hour = 60 * minute
  const day = 24 * hour

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (abs < minute) return rtf.format(Math.round(diffMs / second), 'second')
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), 'minute')
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour')
  return rtf.format(Math.round(diffMs / day), 'day')
}
