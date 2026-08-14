/**
 * Identity / lockout fields shared by tenant and system-admin user views.
 * Upstream payloads may use camelCase or snake_case.
 */

export interface UserIdentityFields {
  userId: string
  providerAuthority?: string | null
  isLockedOut?: boolean
  lockedOutReason?: string | null
  lockedOutAt?: string | null
  lockedOutBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export function pickString(
  raw: Record<string, unknown>,
  camel: string,
  snake: string
): string | null {
  const value = raw[camel] ?? raw[snake]
  if (value == null || value === '') return null
  if (typeof value === 'string') return value
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  return String(value)
}

export function pickBoolean(
  raw: Record<string, unknown>,
  camel: string,
  snake: string
): boolean | undefined {
  const value = raw[camel] ?? raw[snake]
  return typeof value === 'boolean' ? value : undefined
}

export function pickUserIdentity(raw: unknown): UserIdentityFields {
  const u = (raw ?? {}) as Record<string, unknown>
  const isLockedOut = pickBoolean(u, 'isLockedOut', 'is_locked_out')
  const isEnabled = pickBoolean(u, 'isEnabled', 'is_enabled')

  return {
    userId: pickString(u, 'userId', 'user_id') ?? '',
    providerAuthority: pickString(u, 'providerAuthority', 'provider_authority'),
    isLockedOut: isLockedOut ?? isEnabled === false,
    lockedOutReason: pickString(u, 'lockedOutReason', 'locked_out_reason'),
    lockedOutAt: pickString(u, 'lockedOutAt', 'locked_out_at'),
    lockedOutBy: pickString(u, 'lockedOutBy', 'locked_out_by'),
    createdAt: pickString(u, 'createdAt', 'created_at'),
    updatedAt: pickString(u, 'updatedAt', 'updated_at'),
  }
}
