/**
 * Server-side helpers for the Evals API routes.
 *
 * The backend needs the activation id, but the pages only know the agent name and
 * activation name. So the id is always looked up here on the server, never taken from
 * the browser. This stops a user from using an activation of an agent they can't edit.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { createXiansClient, type XiansClient } from './client'
import { decodeAgentNameParam } from './agent-name'
import { assertCanEditAgent } from '@/lib/auth/agent-access'

export interface ResolvedActivation {
  id: string
  name: string
  agentName: string
  isActive: boolean
}

/** The AdminApi path for one activation's health checks. */
export function healthChecksBasePath(tenantId: string, activationId: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations/${encodeURIComponent(activationId)}/health-checks`
}

/** The AdminApi path for all health checks in the tenant. */
export function tenantHealthChecksPath(tenantId: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/health-checks`
}

/** The activation fields used here. */
interface ActivationRecord {
  id?: string
  name?: string
  agentName?: string
  isActive?: boolean
  active?: boolean | null
}

function toList(response: unknown): ActivationRecord[] {
  if (Array.isArray(response)) return response as ActivationRecord[]
  const wrapped = response as { items?: unknown; data?: unknown } | null
  if (Array.isArray(wrapped?.items)) return wrapped.items as ActivationRecord[]
  if (Array.isArray(wrapped?.data)) return wrapped.data as ActivationRecord[]
  return []
}

/**
 * Finds the agent's activation by name in the tenant.
 * Returns null if it doesn't exist.
 */
export async function resolveActivation(
  client: XiansClient,
  tenantId: string,
  agentName: string,
  activationName: string
): Promise<ResolvedActivation | null> {
  const decodedAgent = decodeAgentNameParam(agentName)
  const query = new URLSearchParams({ agentName: decodedAgent })
  const response = await client.get<unknown>(
    `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations?${query.toString()}`
  )

  const match = toList(response).find(
    (activation) =>
      activation?.name === activationName && activation?.agentName === decodedAgent
  )
  if (!match?.id) return null

  return {
    id: String(match.id),
    name: String(match.name),
    agentName: String(match.agentName),
    isActive: Boolean(match.isActive ?? match.active),
  }
}

/** Reads and checks the `agentName` and `activationName` query params. */
export function readActivationParams(
  searchParams: URLSearchParams
): { agentName: string; activationName: string } | NextResponse {
  const agentName = searchParams.get('agentName')
  const activationName = searchParams.get('activationName')
  if (!agentName || !activationName) {
    return NextResponse.json(
      { error: 'agentName and activationName are required' },
      { status: 400 }
    )
  }
  return { agentName: decodeAgentNameParam(agentName), activationName }
}

export function activationNotFound(): NextResponse {
  return NextResponse.json({ error: 'Activation not found' }, { status: 404 })
}

export interface EvalRequestContext {
  client: XiansClient
  activation: ResolvedActivation
  basePath: string
}

/**
 * Common first steps for the evals routes: check the query, check that the user can
 * edit the agent, and look up the activation id. Returns an error response if any step fails.
 *
 * Callers must already use `withTenantAdmin`.
 */
export async function prepareEvalRequest(
  request: NextRequest,
  session: Session,
  tenantId: string
): Promise<EvalRequestContext | NextResponse> {
  const params = readActivationParams(new URL(request.url).searchParams)
  if (params instanceof NextResponse) return params

  const denied = await assertCanEditAgent(session, tenantId, params.agentName)
  if (denied) return denied

  const client = createXiansClient((session as Session & { accessToken?: string }).accessToken)
  const activation = await resolveActivation(client, tenantId, params.agentName, params.activationName)
  if (!activation) return activationNotFound()

  return { client, activation, basePath: healthChecksBasePath(tenantId, activation.id) }
}

export function evalsErrorResponse(error: unknown, fallback: string): NextResponse {
  const e = error as { message?: string; response?: unknown; status?: number } | null
  return NextResponse.json(
    { error: e?.message || fallback, details: e?.response },
    // Status 0 means the backend could not be reached, so return 502.
    { status: e?.status === 0 ? 502 : e?.status || 500 }
  )
}
