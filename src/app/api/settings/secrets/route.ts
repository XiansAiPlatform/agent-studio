import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import {
  buildAdminSecretCreatePayload,
  type CreateSecretBody,
} from '@/app/(dashboard)/settings/secrets/types'

/**
 * GET /api/settings/secrets
 * List secrets for the current tenant (all stored scopes). Tenant comes from
 * the httpOnly cookie. Accessible by anyone with settings:view
 * (TenantParticipantAdmin, TenantUser, TenantAdmin, SysAdmin).
 */
export const GET = withParticipantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const data = await client.get<unknown[]>(
        `/api/v1/admin/secrets?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data ?? [])
    } catch (error) {
      return handleApiError(error, 'settings/secrets GET', {
        fallbackMessage: 'Failed to list secrets',
      })
    }
  }
)

/**
 * POST /api/settings/secrets
 * Create a tenant- or user-scoped secret. Tenant is always the cookie tenant.
 *
 * Request body: {
 *   key: string
 *   value: string
 *   scope?: 'tenant' | 'user'  // default tenant
 *   userId?: string            // required when scope is user (participant id)
 *   description?: string
 *   additionalData?: Record<string, string|number|boolean>
 * }
 *
 * Agent and activation scopes are not accepted from this UI.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: CreateSecretBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = buildAdminSecretCreatePayload(tenantId, body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const data = await client.post<unknown>(
        `/api/v1/admin/secrets`,
        result.payload,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'settings/secrets POST', {
        fallbackMessage: 'Failed to create secret',
      })
    }
  }
)
