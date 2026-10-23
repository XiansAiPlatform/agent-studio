const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export type RelativeTimeStyle = 'short' | 'long'

function formatUnit(value: number, unit: 'minute' | 'hour' | 'day', style: RelativeTimeStyle): string {
  if (style === 'short') return `${value}${unit.charAt(0)}`
  return `${value} ${unit}${value === 1 ? '' : 's'}`
}

/**
 * Formats a timestamp relative to `now` (e.g. "5m ago", "in 2 hours").
 *
 * Rounds the absolute difference down, so a task created seconds ago reads
 * "just now" rather than "1 hour ago" (flooring a negative diff rounds away from zero).
 */
export function formatRelativeTime(
  dateString: string,
  style: RelativeTimeStyle = 'long',
  now: Date = new Date()
): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  const isPast = diffMs >= 0
  const absMs = Math.abs(diffMs)

  if (absMs < MINUTE_MS) return 'just now'

  let label: string
  if (absMs < HOUR_MS) {
    label = formatUnit(Math.floor(absMs / MINUTE_MS), 'minute', style)
  } else if (absMs < DAY_MS) {
    label = formatUnit(Math.floor(absMs / HOUR_MS), 'hour', style)
  } else {
    label = formatUnit(Math.floor(absMs / DAY_MS), 'day', style)
  }

  return isPast ? `${label} ago` : `in ${label}`
}
