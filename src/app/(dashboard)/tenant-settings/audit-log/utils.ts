import type { AuditLogFilters } from './types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/**
 * Normalize a filter value to the `YYYY-MM-DDTHH:mm:ss` (local time) format used by
 * `<input type="datetime-local" step="1">`. Values without seconds (the browser omits
 * `:00`, and older URLs use minute precision) get `:00`. Date-only values (older URLs)
 * become the start (00:00:00) or end (23:59:59) of that day. Returns null when the
 * value is not usable.
 */
export function normalizeDateTimeLocal(
  value: string | null,
  boundary: 'start' | 'end'
): string | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return `${value}T${boundary === 'start' ? '00:00:00' : '23:59:59'}`;
  if (DATETIME_LOCAL.test(value)) return value.length === 16 ? `${value}:00` : value;
  return null;
}

/**
 * Convert a local `YYYY-MM-DDTHH:mm[:ss]` value to a UTC ISO string. The backend stores
 * timestamps as DateTime.UtcNow, so filters must be compared in UTC. A start boundary
 * is the beginning of its second and an end boundary the last millisecond of it.
 */
function localToUtcIso(value: string | null, boundary: 'start' | 'end'): string | null {
  const normalized = normalizeDateTimeLocal(value, boundary);
  if (!normalized) return null;
  const date = new Date(normalized); // no offset => parsed as local time
  if (Number.isNaN(date.getTime())) return null;
  if (boundary === 'end') date.setMilliseconds(999);
  return date.toISOString();
}

/** Parse an API timestamp as UTC (a value without a Z/offset is treated as UTC). */
export function parseUtcTimestamp(value: string): Date {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone || !value.includes('T') ? value : `${value}Z`);
}

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
};

/** Format an API (UTC) timestamp for display in the viewer's local time. */
export function formatDateTime(value: string): string {
  const d = parseUtcTimestamp(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, DATE_TIME_FORMAT);
}

/** Format a local `datetime-local` filter value (or legacy date-only) for display. */
export function formatFilterDateTime(value: string, boundary: 'start' | 'end'): string {
  const normalized = normalizeDateTimeLocal(value, boundary);
  if (!normalized) return value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, DATE_TIME_FORMAT);
}

/** Serialize audit log filters into the query params understood by /api/audit-log. */
export function buildFilterQuery(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.performedBy) params.set('performedBy', filters.performedBy);
  // Action names are dot-separated identifiers (never contain commas); the API takes a comma-separated list.
  if (filters.actions.length > 0) params.set('action', filters.actions.join(','));
  if (filters.onlyWithoutActivation) {
    params.set('onlyWithoutActivation', 'true');
  } else if (filters.activationName) {
    params.set('activationName', filters.activationName);
  }
  // Dates are kept as local `YYYY-MM-DDTHH:mm` here (page URL); see buildApiFilterQuery.
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params;
}

/** Same as buildFilterQuery, but with dates converted to UTC ISO for the API call. */
export function buildApiFilterQuery(filters: AuditLogFilters): URLSearchParams {
  const params = buildFilterQuery(filters);
  params.delete('startDate');
  params.delete('endDate');
  const start = localToUtcIso(filters.startDate, 'start');
  const end = localToUtcIso(filters.endDate, 'end');
  if (start) params.set('startDate', start);
  if (end) params.set('endDate', end);
  return params;
}
