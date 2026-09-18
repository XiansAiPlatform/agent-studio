import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { validationError } from '@/lib/api/error-handler'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { agentNamesEqual, decodeAgentNameParam } from '@/lib/xians/agent-name'
import { createTtlCache } from '@/lib/xians/cache'
import { createXiansClient, XiansApiError, type XiansClient } from '@/lib/xians/client'
import type { PaginatedResponse, XiansAgentActivation } from '@/lib/xians/types'

/** Cap on JSON document fields forwarded to AdminAPI (content / metadata). */
export const ADMIN_DATA_JSON_MAX_BYTES = 256 * 1024

/** Whole-request ceiling checked via Content-Length before JSON.parse. */
export const ADMIN_DATA_BODY_MAX_BYTES = 512 * 1024

/**
 * Positive activation-ownership hits only. Short enough that a reassigned
 * activation cannot gate a write for long; long enough that back-to-back
 * creates skip a full AdminAPI list. Misses are not stored (loader throws).
 */
export const ACTIVATION_OWNERSHIP_TTL_MS = 2_000

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

export function oversizedRequestError(request: Request): NextResponse | null {
  const raw = request.headers.get('content-length')
  if (raw == null || raw === '') return null
  const length = Number(raw)
  if (!Number.isFinite(length) || length < 0) return null
  if (length > ADMIN_DATA_BODY_MAX_BYTES) {
    return validationError(`Request body must be at most ${ADMIN_DATA_BODY_MAX_BYTES} bytes`)
  }
  return null
}

function activationItemsFrom(
  result: PaginatedResponse<XiansAgentActivation> | XiansAgentActivation[] | null
): XiansAgentActivation[] {
  return Array.isArray(result) ? result : result?.data ?? []
}

function pageOwnsActivation(
  result: PaginatedResponse<XiansAgentActivation> | XiansAgentActivation[] | null,
  canonicalAgent: string,
  canonicalActivation: string
): boolean {
  return activationItemsFrom(result).some(
    (item) =>
      agentNamesEqual(item.name, canonicalActivation) &&
      agentNamesEqual(item.agentName, canonicalAgent)
  )
}

/**
 * Look up one activation on one agent. Sends `name` in case AdminAPI filters
 * by it (O(1)). Page 1 is fetched first (common hit); any remaining pages
 * load concurrently so a miss is one extra round trip, not 19 sequential ones.
 * Misses are still not TTL-cached (a reassigned activation must fail closed).
 */
async function findActivationOwnedByAgent(
  client: XiansClient,
  tenantId: string,
  canonicalAgent: string,
  canonicalActivation: string
): Promise<boolean> {
  const pageSize = 100
  const maxPages = 20
  const tenantHeader = { headers: { 'X-Tenant-Id': tenantId } }

  const fetchPage = (page: number) => {
    const params = new URLSearchParams({
      agentName: canonicalAgent,
      name: canonicalActivation,
      page: String(page),
      pageSize: String(pageSize),
    })
    return client.get<PaginatedResponse<XiansAgentActivation>>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations?${params.toString()}`,
      tenantHeader
    )
  }

  const first = await fetchPage(1)
  if (pageOwnsActivation(first, canonicalAgent, canonicalActivation)) return true

  const reportedPages = Array.isArray(first) ? 1 : first?.pagination?.totalPages ?? 1
  const totalPages = Math.min(Math.max(reportedPages, 1), maxPages)
  if (totalPages <= 1) return false

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
  )
  return rest.some((result) =>
    pageOwnsActivation(result, canonicalAgent, canonicalActivation)
  )
}

class ActivationNotOwnedError extends Error {
  constructor() {
    super('activationName does not belong to this agent')
    this.name = 'ActivationNotOwnedError'
  }
}

const activationOwnedCache = createTtlCache<true>(ACTIVATION_OWNERSHIP_TTL_MS)

/**
 * Confirm activationName is a real activation of agentName in this tenant.
 * Used on POST so a Write/Owner caller cannot stamp an arbitrary activation tag.
 *
 * Positive hits are cached 2s per tenant+agent+activation so sequential creates
 * do not re-list AdminAPI. Misses are not cached. The extra GET-by-id on
 * PUT/DELETE is a separate, intentional authz trade-off.
 */
export async function assertActivationOwnedByAgent(
  client: XiansClient,
  tenantId: string,
  agentName: string,
  activationName: string
): Promise<NextResponse | null> {
  const canonicalAgent = decodeAgentNameParam(agentName)
  const canonicalActivation = decodeAgentNameParam(activationName)
  const cacheKey = `${tenantId}|${canonicalAgent}|${canonicalActivation}`

  try {
    await activationOwnedCache.get(cacheKey, async () => {
      const owned = await findActivationOwnedByAgent(
        client,
        tenantId,
        canonicalAgent,
        canonicalActivation
      )
      if (!owned) throw new ActivationNotOwnedError()
      return true as const
    })
    return null
  } catch (error) {
    if (error instanceof ActivationNotOwnedError) {
      return validationError('activationName does not belong to this agent')
    }
    throw error
  }
}

/** Test helper: drop positive ownership hits so cases don't leak across tests. */
export function resetActivationOwnershipCacheForTests(): void {
  activationOwnedCache.clear()
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
