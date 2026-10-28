/**
 * Secret vault types for Agent Studio.
 *
 * Scope is implied by which ids are set on the secret: `userId` (user),
 * `agentId` (agent, the agent object id) or `activationName` (activation). The create form's `scope` only drives validation and is not
 * forwarded to the Admin API.
 */

export type CreateSecretScope = 'tenant' | 'user' | 'agent' | 'activation'

export type SecretScopeKind = 'tenant' | 'agent' | 'user' | 'activation'

export interface TenantSecret {
  id: string
  key: string
  tenantId: string | null
  agentId: string | null
  userId: string | null
  activationName: string | null
  /** JSON string from the Admin API (older rows may deserialize to an object). */
  additionalData?: string | Record<string, string | number | boolean> | null
  createdAt: string
  createdBy: string
}

export interface CreateSecretRequest {
  key: string
  value: string
  scope: CreateSecretScope
  /** Participant id (usually lowercase email). Required when scope is `user`. */
  userId?: string
  /** Agent object id. Required when scope is `agent` or `activation`. */
  agentId?: string
  /** Required when scope is `activation`. */
  activationName?: string
  description?: string
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

/** Agent object id -> agent name, used to show names instead of ids. */
export type AgentNameMap = Record<string, string>

export function getSecretScopeDetail(
  secret: Pick<TenantSecret, 'agentId' | 'userId' | 'activationName'>,
  agentNames?: AgentNameMap
): string | undefined {
  const kind = getSecretScopeKind(secret)
  if (kind === 'activation') return secret.activationName ?? undefined
  if (kind === 'user') return secret.userId ?? undefined
  if (kind === 'agent' && secret.agentId) return agentNames?.[secret.agentId] ?? secret.agentId
  return undefined
}

export function getSecretScopeLabel(
  secret: Pick<TenantSecret, 'agentId' | 'userId' | 'activationName'>,
  agentNames?: AgentNameMap
): string {
  const kind = getSecretScopeKind(secret)
  const detail = getSecretScopeDetail(secret, agentNames)
  return detail ? `${SECRET_SCOPE_LABELS[kind]} · ${detail}` : SECRET_SCOPE_LABELS[kind]
}

/** `additionalData` is a JSON object; older rows may be a JSON string. Returns the object, if any. */
export function parseAdditionalData(
  raw: TenantSecret['additionalData']
): Record<string, string | number | boolean> | undefined {
  if (!raw) return undefined
  if (typeof raw === 'object') return raw
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string | number | boolean>)
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Helper: the secret's description, stored under the `description` key of
 * `additionalData`. Returns undefined when none is set.
 */
export function getSecretDescription(secret: TenantSecret): string | undefined {
  const data = parseAdditionalData(secret.additionalData)
  const raw = data?.description
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export type AdminSecretCreatePayload = {
  key: string
  value: string
  tenantId: string
  userId?: string
  /** Agent object id. */
  agentId?: string
  activationName?: string
  /** JSON object of string / number / boolean values only. */
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
 * Agent scope sends the agent object id; activation scope sends only the
 * activation name (the agent is returned separately as `authAgentId`).
 */
export function buildAdminSecretCreatePayload(
  tenantId: string,
  body: CreateSecretBody
):
  | {
      ok: true
      payload: AdminSecretCreatePayload
      /** Agent object id to authorize against (agent and activation scopes). */
      authAgentId?: string
    }
  | { ok: false; error: string } {
  const key = body.key?.trim()
  const value = body.value
  if (!key) return { ok: false, error: 'Key is required' }
  if (!value || value.length === 0) return { ok: false, error: 'Value is required' }

  const scope = (body.scope ?? 'tenant').trim().toLowerCase()
  if (scope !== 'tenant' && scope !== 'user' && scope !== 'agent' && scope !== 'activation') {
    return { ok: false, error: 'Scope must be tenant, user, agent or activation' }
  }

  const userId = body.userId?.trim().toLowerCase()
  const agentId = body.agentId?.trim()
  const activationName = body.activationName?.trim()

  if (scope !== 'user' && userId) {
    return { ok: false, error: `User id is not allowed for ${scope}-scoped secrets` }
  }
  if ((scope === 'tenant' || scope === 'user') && (agentId || activationName)) {
    return { ok: false, error: `Agent and activation are not allowed for ${scope}-scoped secrets` }
  }
  if (scope === 'agent' && activationName) {
    return { ok: false, error: 'Activation is not allowed for agent-scoped secrets' }
  }

  const description = body.description?.trim()

  const payload: AdminSecretCreatePayload = {
    key,
    value,
    tenantId,
  }
  if (description) {
    payload.additionalData = { description }
  }

  if (scope === 'user') {
    if (!userId) {
      return { ok: false, error: 'Participant id is required for user-scoped secrets' }
    }
    payload.userId = userId
  } else if (scope === 'agent') {
    if (!agentId) return { ok: false, error: 'Agent is required for agent-scoped secrets' }
    payload.agentId = agentId
  } else if (scope === 'activation') {
    if (!agentId) return { ok: false, error: 'Agent is required for activation-scoped secrets' }
    if (!activationName) {
      return { ok: false, error: 'Activation is required for activation-scoped secrets' }
    }
    // Admin API needs only the activation name; the agent is used for the
    // Studio-side access check and is not forwarded.
    payload.activationName = activationName
  }
  return {
    ok: true,
    payload,
    ...(agentId && (scope === 'agent' || scope === 'activation') ? { authAgentId: agentId } : {}),
  }
}
