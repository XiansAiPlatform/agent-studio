/**
 * Human-friendly rendering of a schedule's spec string.
 *
 * The backend emits one of a few canonical shapes (joined with "; " when a
 * schedule has multiple triggers):
 *   - A cron expression:        "0 9 * * 1-5"
 *   - An interval:              "Every 1h 30m" / "Every 30m (offset 5m)"
 *   - "Unknown schedule"
 *
 * Older records may still contain the raw .NET ToString() dump, e.g.
 *   "ScheduleSpec { Calendars = System.Collections.Generic.List`1[...], ... }".
 * We detect that and degrade gracefully rather than showing the type names.
 */

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const MONTH_NAMES = [
  '',
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
]

export interface HumanSchedule {
  /** Friendly description, e.g. "Weekdays at 09:00". */
  label: string
  /** The underlying canonical spec (cron / interval), when meaningful. */
  raw?: string
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** True for the legacy raw ScheduleSpec ToString() dump. */
function isLegacyDump(spec: string): boolean {
  return (
    spec.startsWith('ScheduleSpec') ||
    spec.includes('System.Collections') ||
    spec.includes('Temporalio.')
  )
}

/** Pulls any cron expressions out of a legacy "CronExpressions = [ ... ]" dump. */
function extractLegacyCrons(spec: string): string[] {
  const match = spec.match(/CronExpressions\s*=\s*\[([^\]]*)\]/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function isEveryValue(field: string): boolean {
  return field === '*' || field === '*/1'
}

/** Format a single cron field listing concrete values (no ranges/steps). */
function describeTime(minute: string, hour: string): string | null {
  const m = Number(minute)
  const h = Number(hour)
  if (!Number.isInteger(m) || !Number.isInteger(h)) return null
  return `${pad2(h)}:${pad2(m)}`
}

function describeStep(field: string, unit: string): string | null {
  const stepMatch = field.match(/^\*\/(\d+)$/)
  if (!stepMatch) return null
  const n = Number(stepMatch[1])
  return `Every ${n} ${unit}${n === 1 ? '' : 's'}`
}

function describeDaysOfWeek(dow: string): string | null {
  if (isEveryValue(dow)) return null
  if (dow === '1-5') return 'on weekdays'
  if (dow === '0,6' || dow === '6,0') return 'on weekends'

  const names = dow
    .split(',')
    .map((part) => {
      const range = part.match(/^(\d)-(\d)$/)
      if (range) {
        const start = Number(range[1])
        const end = Number(range[2])
        const out: string[] = []
        for (let i = start; i <= end; i++) out.push(DAY_NAMES[i % 7])
        return out.join(', ')
      }
      const n = Number(part)
      return Number.isInteger(n) ? DAY_NAMES[n % 7] : null
    })
    .filter((n): n is string => Boolean(n))

  return names.length > 0 ? `on ${names.join(', ')}` : null
}

/** Humanize a 5-field cron expression; falls back to the raw cron when unsure. */
function humanizeCron(cron: string): string {
  const fields = cron.trim().split(/\s+/)
  // Support optional leading seconds field (6 fields) by dropping it.
  const parts = fields.length === 6 ? fields.slice(1) : fields
  if (parts.length !== 5) return cron

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // "*/N * * * *" style step expressions.
  const minuteStep = describeStep(minute, 'minute')
  if (minuteStep && isEveryValue(hour) && isEveryValue(dayOfMonth) && isEveryValue(month) && isEveryValue(dayOfWeek)) {
    return minuteStep
  }
  const hourStep = describeStep(hour, 'hour')
  if (minute === '0' && hourStep && isEveryValue(dayOfMonth) && isEveryValue(month) && isEveryValue(dayOfWeek)) {
    return hourStep
  }

  // Every minute.
  if (isEveryValue(minute) && isEveryValue(hour) && isEveryValue(dayOfMonth) && isEveryValue(month) && isEveryValue(dayOfWeek)) {
    return 'Every minute'
  }

  const time = describeTime(minute, hour)
  if (!time) return cron // ranges/lists in time fields — keep the cron.

  const dowText = describeDaysOfWeek(dayOfWeek)
  const dayOfMonthSet = !isEveryValue(dayOfMonth)
  const monthSet = !isEveryValue(month)

  // Weekly (specific day-of-week).
  if (dowText && !dayOfMonthSet && !monthSet) {
    const pretty =
      dowText === 'on weekdays'
        ? 'Weekdays'
        : dowText === 'on weekends'
          ? 'Weekends'
          : dowText.replace(/^on /, '')
    return `${pretty} at ${time}`
  }

  // Monthly / yearly (specific day-of-month, optional month).
  if (dayOfMonthSet) {
    const dom = Number(dayOfMonth)
    const dayLabel = Number.isInteger(dom) ? `day ${dom}` : `day ${dayOfMonth}`
    if (monthSet) {
      const mo = Number(month)
      const monthLabel = Number.isInteger(mo) ? MONTH_NAMES[mo] ?? month : month
      return `Yearly on ${monthLabel} ${dayLabel} at ${time}`
    }
    return `Monthly on ${dayLabel} at ${time}`
  }

  // Daily (every day, fixed time).
  return `Daily at ${time}`
}

function humanizePart(part: string): string {
  const trimmed = part.trim()
  if (!trimmed) return ''
  if (/^every\b/i.test(trimmed)) return trimmed // already a friendly interval
  return humanizeCron(trimmed)
}

/**
 * Convert a backend spec string into a friendly label plus its canonical form.
 */
export function humanizeScheduleSpec(spec?: string | null): HumanSchedule {
  const value = (spec ?? '').trim()
  if (!value) return { label: 'Unknown schedule' }

  if (isLegacyDump(value)) {
    const crons = extractLegacyCrons(value)
    if (crons.length > 0) {
      return {
        label: crons.map(humanizeCron).join(', '),
        raw: crons.join(', '),
      }
    }
    return { label: 'Custom schedule' }
  }

  if (/^unknown schedule$/i.test(value)) {
    return { label: 'Unknown schedule' }
  }

  const parts = value.split(';').map((p) => p.trim()).filter(Boolean)
  const label = parts.map(humanizePart).filter(Boolean).join(', ')

  return {
    label: label || value,
    raw: value,
  }
}
