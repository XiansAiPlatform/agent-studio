import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { validationError } from '@/lib/api/error-handler'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { agentNamesEqual, decodeAgentNameParam } from '@/lib/xians/agent-name'
import { createXiansClient, XiansApiError, type XiansClient } from '@/lib/xians/client'
import type { PaginatedResponse, XiansAgentActivation } from '@/lib/xians/types'

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

/**
 * Confirm activationName is a real activation of agentName in this tenant.
 * Used on POST so a Write/Owner caller cannot stamp an arbitrary activation tag.
 */
export async function assertActivationOwnedByAgent(
  client: XiansClient,
  tenantId: string,
  agentName: string,
  activationName: string
): Promise<NextResponse | null> {
  const canonicalAgent = decodeAgentNameParam(agentName)
  const canonicalActivation = decodeAgentNameParam(activationName)
  const pageSize = 100
  const maxPages = 20
  let page = 1
  let totalPages = 1

  while (page <= totalPages && page <= maxPages) {
    const params = new URLSearchParams({
      agentName: canonicalAgent,
      page: String(page),
      pageSize: String(pageSize),
    })
    const result = await client.get<PaginatedResponse<XiansAgentActivation>>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations?${params.toString()}`,
      { headers: { 'X-Tenant-Id': tenantId } }
    )
    const items = Array.isArray(result) ? result : result?.data ?? []
    const owned = items.some(
      (item) =>
        agentNamesEqual(item.name, canonicalActivation) &&
        agentNamesEqual(item.agentName, canonicalAgent)
    )
    if (owned) return null
    totalPages = Array.isArray(result) ? 1 : result?.pagination?.totalPages ?? 1
    page += 1
  }

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
