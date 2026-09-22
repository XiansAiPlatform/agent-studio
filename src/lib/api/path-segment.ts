/**
 * Single URL path-segment identifier. Rejects `.` / `..`, slashes, and
 * percent-encoding so a value cannot change the upstream Admin API path
 * when interpolated into `/api/v1/admin/tenants/{tenantId}/.../{id}/...`.
 *
 * `encodeURIComponent` alone is not enough: it leaves `.` and `..` unchanged,
 * and `new URL(path, base)` will then resolve those as relative segments.
 */
export const PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/

export const PATH_SEGMENT_MAX_LENGTH = 128

export function isSafePathSegment(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= PATH_SEGMENT_MAX_LENGTH &&
    PATH_SEGMENT_PATTERN.test(value)
  )
}

/**
 * Validate a dynamic route param and encode it as a single URL path segment.
 * Returns null when the value is missing or not a safe identifier.
 */
export function encodeSafePathSegment(raw: string | undefined): string | null {
  if (!isSafePathSegment(raw)) return null
  return encodeURIComponent(raw)
}
