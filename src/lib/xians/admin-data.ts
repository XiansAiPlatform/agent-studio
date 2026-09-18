import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { validationError } from '@/lib/api/error-handler'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { agentNamesEqual, decodeAgentNameParam } from '@/lib/xians/agent-name'
import { createTtlCache, TENANT_LOOKUP_TTL_MS } from '@/lib/xians/cache'
import { createXiansClient, XiansApiError, type XiansClient } from '@/lib/xians/client'
import type { PaginatedResponse, XiansAgentActivation } from '@/lib/xians/types'

/** Same short TTL as other auth lookups — collapses back-to-back POSTs for one agent. */
const activationNamesByAgent = createTtlCache<Set<string>>(TENANT_LOOKUP_TTL_MS)

/** Cap on JSON document fields forwarded to AdminAPI (content / metadata). */
export const ADMIN_DATA_JSON_MAX_BYTES = 256 * 1024

export interface AdminDataItem {
  id?: string | null
  key?: string | null
  type?: string | null
  agentName?: string | null
  activationName?: string | null
  participantId?: string | null
  content?: unknown
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string | null
  expiresAt?: string | null
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function jsonExceedsByteLimit(
  value: unknown,
  maxBytes = ADMIN_DATA_JSON_MAX_BYTES
): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length > maxBytes
  } catch {
    return true
  }
}

export function isIsoDateTime(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return !Number.isNaN(Date.parse(trimmed))
}

function activationItemsFrom(
  result: PaginatedResponse<XiansAgentActivation> | XiansAgentActivation[] | null
): XiansAgentActivation[] {
  return Array.isArray(result) ? result : result?.data ?? []
}

async function loadActivationNamesForAgent(
  client: XiansClient,
  tenantId: string,
  canonicalAgent: string
): Promise<Set<string>> {
  const pageSize = 100
  const maxPages = 20
  const tenantHeader = { headers: { 'X-Tenant-Id': tenantId } }
  const names = new Set<string>()

  const fetchPage = (page: number) => {
    const params = new URLSearchParams({
      agentName: canonicalAgent,
      page: String(page),
      pageSize: String(pageSize),
    })
    return client.get<PaginatedResponse<XiansAgentActivation>>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations?${params.toString()}`,
      tenantHeader
    )
  }

  const collect = (
    result: PaginatedResponse<XiansAgentActivation> | XiansAgentActivation[] | null
  ) => {
    for (const item of activationItemsFrom(result)) {
      if (item.name && agentNamesEqual(item.agentName, canonicalAgent)) {
        names.add(decodeAgentNameParam(item.name))
      }
    }
  }

  const first = await fetchPage(1)
  collect(first)
  const reportedPages = Array.isArray(first) ? 1 : first?.pagination?.totalPages ?? 1
  const totalPages = Math.min(Math.max(reportedPages, 1), maxPages)
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
    )
    for (const page of rest) collect(page)
  }

  return names
}

/**
 * Confirm activationName is a real activation of agentName in this tenant.
 * Used on POST so a Write/Owner caller cannot stamp an arbitrary activation tag.
 *
 * Activation names are cached per tenant+agent for TENANT_LOOKUP_TTL_MS so
 * back-to-back creates do not re-list AdminAPI. There is no by-name lookup
 * on this client; a filtered AdminAPI query would be the O(1) follow-up.
 */
export async function assertActivationOwnedByAgent(
  client: XiansClient,
  tenantId: string,
  agentName: string,
  activationName: string
): Promise<NextResponse | null> {
  const canonicalAgent = decodeAgentNameParam(agentName)
  const canonicalActivation = decodeAgentNameParam(activationName)
  const names = await activationNamesByAgent.get(
    `${tenantId}|${canonicalAgent}`,
    () => loadActivationNamesForAgent(client, tenantId, canonicalAgent)
  )
  if (names.has(canonicalActivation)) return null
  return validationError('activationName does not belong to this agent')
}

export function adminDataCollectionPath(tenantId: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/data`
}

export function adminDataRecordPath(tenantId: string, recordId: string): string {
  return `${adminDataCollectionPath(tenantId)}/${encodeURIComponent(recordId)}`
}

export function adminDataSchemaPath(tenantId: string): string {
  return `${adminDataCollectionPath(tenantId)}/schema`
}

/**
 * Load a data record and confirm the caller may edit its owning agent.
 * Missing / cross-tenant records are 404, matching AdminAPI.
 *
 * The extra GET-by-id before PUT/DELETE is intentional: Studio calls AdminAPI
 * with a service key, so we must not trust a client-supplied agentName.
 * A lighter ownership lookup belongs in AdminAPI, not a removal of this gate.
 */
export async function loadRecordIfEditable(
  client: XiansClient,
  session: Session,
  tenantId: string,
  recordId: string
): Promise<[AdminDataItem, null] | [null, NextResponse]> {
  try {
    const item = await client.get<AdminDataItem>(adminDataRecordPath(tenantId, recordId))
    const denied = await assertCanEditAgent(session, tenantId, item?.agentName)
    if (denied) return [null, denied]
    return [item, null]
  } catch (error) {
    if (error instanceof XiansApiError && error.status === 404) {
      return [
        null,
        NextResponse.json({ error: 'Record not found', code: 'not_found' }, { status: 404 }),
      ]
    }
    throw error
  }
}

export function createAdminDataClient(): XiansClient {
  return createXiansClient()
}
