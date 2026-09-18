import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { createXiansClient, XiansApiError, type XiansClient } from '@/lib/xians/client'

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
