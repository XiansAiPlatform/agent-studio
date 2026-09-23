/**
 * Secret vault types for Agent Studio.
 *
 * Create is limited to tenant or user scope. Agent- and activation-scoped
 * secrets may still appear in the list when created from the SDK.
 */

export type CreateSecretScope = 'tenant' | 'user'

export type SecretScopeKind = 'tenant' | 'agent' | 'user' | 'activation'

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
  scope: CreateSecretScope
  /** Participant id (usually lowercase email). Required when scope is `user`. */
  userId?: string
  description?: string
  additionalData?: Record<string, string | number | boolean>
}

export const SECRET_SCOPE_LABELS: Record<SecretScopeKind, string> = {
  tenant: 'Tenant',
  agent: 'Agent',
  user: 'User',
  activation: 'Activation',
}

export function getSecretScopeKind(
  secret: Pick<TenantSecret, 'agentId' | 'userId' | 'activationName'>
): SecretScopeKind {
  if (secret.activationName) return 'activation'
  if (secret.userId) return 'user'
  if (secret.agentId) return 'agent'
  return 'tenant'
}

export function getSecretScopeDetail(
  secret: Pick<TenantSecret, 'agentId' | 'userId' | 'activationName'>
): string | undefined {
  const kind = getSecretScopeKind(secret)
  if (kind === 'activation') return secret.activationName ?? undefined
  if (kind === 'user') return secret.userId ?? undefined
  if (kind === 'agent') return secret.agentId ?? undefined
  return undefined
}

export function getSecretScopeLabel(
  secret: Pick<TenantSecret, 'agentId' | 'userId' | 'activationName'>
): string {
  const kind = getSecretScopeKind(secret)
  const detail = getSecretScopeDetail(secret)
  return detail ? `${SECRET_SCOPE_LABELS[kind]} · ${detail}` : SECRET_SCOPE_LABELS[kind]
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

export type AdminSecretCreatePayload = {
  key: string
  value: string
  tenantId: string
  userId?: string
  additionalData?: Record<string, string | number | boolean>
}

export type CreateSecretBody = {
  key?: string
  value?: string
  description?: string
  additionalData?: Record<string, string | number | boolean>
  scope?: string
  userId?: string
  agentId?: string
  activationName?: string
}

/**
 * Validates a Studio create-secret body and maps it to the Admin API payload.
 * Tenant is always taken from the session cookie, never from the client.
 * Agent and activation scopes are rejected.
 */
export function buildAdminSecretCreatePayload(
  tenantId: string,
  body: CreateSecretBody
): { ok: true; payload: AdminSecretCreatePayload } | { ok: false; error: string } {
  const key = body.key?.trim()
  const value = body.value
  if (!key) return { ok: false, error: 'Key is required' }
  if (!value || value.length === 0) return { ok: false, error: 'Value is required' }

  if (body.agentId?.trim() || body.activationName?.trim()) {
    return { ok: false, error: 'Agent and activation scopes cannot be set from this UI' }
  }

  const scope = (body.scope ?? 'tenant').trim().toLowerCase()
  if (scope !== 'tenant' && scope !== 'user') {
    return { ok: false, error: 'Scope must be tenant or user' }
  }

  const description = body.description?.trim()
  const additionalData: Record<string, string | number | boolean> = {
    ...(body.additionalData ?? {}),
  }
  if (description) {
    additionalData.description = description
  }

  const payload: AdminSecretCreatePayload = {
    key,
    value,
    tenantId,
  }
  if (Object.keys(additionalData).length > 0) {
    payload.additionalData = additionalData
  }

  if (scope === 'tenant') {
    if (body.userId?.trim()) {
      return { ok: false, error: 'User id is not allowed for tenant-scoped secrets' }
    }
    return { ok: true, payload }
  }

  const userId = body.userId?.trim().toLowerCase()
  if (!userId) {
    return { ok: false, error: 'Participant id is required for user-scoped secrets' }
  }
  payload.userId = userId
  return { ok: true, payload }
}
