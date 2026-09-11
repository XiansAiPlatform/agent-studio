/**
 * Per-agent edit authorization for Agent Studio.
 *
 * Studio talks to the backend only with the service API key, so the server
 * can't per-user gate a Studio request. This module asks the backend "which
 * agents in this tenant can <user> edit?" — resolved by the user's email, the
 * one stable identifier every Studio session carries — and turns the answer
 * into a gate for route handlers and a filter for the settings-page pickers.
 *
 * Model (product decision): only Write / Owner on an agent, or TenantAdmin /
 * SysAdmin, grants access to that agent's settings. A Read grant or no grant
 * means the agent is invisible on the settings pages and blocked at the API.
 */

import type { Session } from 'next-auth'
import type { NextResponse } from 'next/server'
import { createXiansClient } from '@/lib/xians/client'
import { createTtlCache, TENANT_LOOKUP_TTL_MS } from '@/lib/xians/cache'
import { forbiddenError, validationError } from '@/lib/api/error-handler'

export type AgentLevel = 'Read' | 'Write' | 'Owner'

interface AgentAccessResponse {
  user: string
  isSysAdmin: boolean
  isTenantAdmin: boolean
  agents: Record<string, AgentLevel>
}

export interface AgentEditability {
  /** TenantAdmin / SysAdmin — may edit every agent in the tenant. */
  canEditAll: boolean
  /** Raw per-agent grant, by agent name. */
  levels: Record<string, AgentLevel>
  /** Agent names the user may edit (Write/Owner). Empty when `canEditAll`. */
  editable: Set<string>
}

const EMPTY: AgentEditability = { canEditAll: false, levels: {}, editable: new Set() }

// Short TTL: this backs an authorization gate, so a revoked grant becomes
// visible after at most TENANT_LOOKUP_TTL_MS. Shared across users is fine —
// the key includes the user's email and the upstream call uses the service key.
const cache = createTtlCache<AgentAccessResponse>(TENANT_LOOKUP_TTL_MS)

async function fetchAgentAccess(tenantId: string, identifier: string): Promise<AgentAccessResponse> {
  const client = createXiansClient()
  return client.get<AgentAccessResponse>(
    `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-access?user=${encodeURIComponent(identifier)}`,
    { headers: { 'X-Tenant-Id': tenantId } }
  )
}

/**
 * Resolve which agents a user may edit in the given tenant. `identifier` may be
 * a user id or an email — the backend accepts either and resolves globally
 * (`IUserRepository.GetByUserIdOrEmailAsync`), independent of tenant membership,
 * so this also works for e.g. a SysAdmin who isn't a member of this tenant.
 * Fails closed (empty) when the user can't be identified or the lookup fails.
 */
export async function resolveAgentEditabilityFor(
  identifier: string | null | undefined,
  tenantId: string
): Promise<AgentEditability> {
  if (!identifier || !tenantId) return EMPTY

  try {
    const res = await cache.get(`${tenantId}|${identifier.toLowerCase()}`, () =>
      fetchAgentAccess(tenantId, identifier)
    )
    const agents = res.agents ?? {}
    return {
      canEditAll: res.isSysAdmin || res.isTenantAdmin,
      levels: agents,
      editable: new Set(
        Object.entries(agents)
          .filter(([, lvl]) => lvl === 'Write' || lvl === 'Owner')
          .map(([name]) => name)
      ),
    }
  } catch {
    return EMPTY
  }
}

/**
 * Resolve which agents the session user may edit in the given tenant.
 * Fails closed (empty) when the user can't be identified or the lookup fails.
 */
export async function resolveAgentEditability(
  session: Session | null,
  tenantId: string
): Promise<AgentEditability> {
  return resolveAgentEditabilityFor(session?.user?.email, tenantId)
}

/**
 * Route-handler gate: returns a NextResponse to short-circuit with, or null
 * when the session user may edit `agentName`.
 */
export async function assertCanEditAgent(
  session: Session | null,
  tenantId: string,
  agentName: string | null | undefined
): Promise<NextResponse | null> {
  if (!agentName) return validationError('Agent name is required')

  const { canEditAll, editable } = await resolveAgentEditability(session, tenantId)
  if (canEditAll || editable.has(agentName)) return null
  return forbiddenError('You need write access to this agent to perform this action.')
}

/**
 * Same gate for an activation, addressed by id: resolve its owning agent, then
 * check. Used by the activation lifecycle routes which don't carry an agent name.
 */
export async function assertCanEditActivation(
  session: Session | null,
  tenantId: string,
  activationId: string | null | undefined
): Promise<NextResponse | null> {
  if (!activationId) return validationError('Activation id is required')

  let agentName: string | undefined
  try {
    const activation = await createXiansClient().get<{ agentName?: string }>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations/${encodeURIComponent(activationId)}`,
      { headers: { 'X-Tenant-Id': tenantId } }
    )
    agentName = activation?.agentName
  } catch {
    return forbiddenError('Unable to verify access to this activation.')
  }
  return assertCanEditAgent(session, tenantId, agentName)
}
