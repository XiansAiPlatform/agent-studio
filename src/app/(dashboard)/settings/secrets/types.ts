/**
 * Secret vault types — tenant-scoped only.
 *
 * The backend supports additional scopes (agent, user, activation), but this
 * UI intentionally restricts secrets to the current tenant only.
 */

export interface TenantSecret {
  id: string
  key: string
  tenantId: string | null
  agentId: string | null
  userId: string | null
  activationName: string | null
  additionalData?: Record<string, string | number | boolean> | null
  createdAt: string
  createdBy: string
}

export interface CreateSecretRequest {
  key: string
  value: string
  description?: string
  additionalData?: Record<string, string | number | boolean>
}

/**
 * Helper: pull the user-friendly description out of the secret's
 * AdditionalData blob. Returns undefined when none is set.
 */
export function getSecretDescription(secret: TenantSecret): string | undefined {
  const raw = secret.additionalData?.description
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
