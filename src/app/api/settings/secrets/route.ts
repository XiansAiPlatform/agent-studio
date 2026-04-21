import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/settings/secrets
 * List secrets scoped to the current tenant. Tenant is resolved from the httpOnly cookie.
 * Only accessible by TenantParticipantAdmin.
 *
 * Note: Secrets are intentionally restricted to tenant scope only — agent-level,
 * user-level, and activation-level scoping are not exposed in this UI.
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
 * Create a new tenant-scoped secret.
 * Only accessible by TenantParticipantAdmin.
 *
 * Request body: { key: string, value: string, additionalData?: Record<string, string|number|boolean> }
 * The secret is always scoped to the current tenant — agentId / userId / activationName
 * are intentionally never sent.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: {
      key?: string
      value?: string
      description?: string
      additionalData?: Record<string, string | number | boolean>
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const key = body.key?.trim()
    const value = body.value
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }
    if (!value || value.length === 0) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    // Compose AdditionalData. The description is stored in the
    // server-validated AdditionalData blob (string values, max ~2KB each).
    const description = body.description?.trim()
    const additionalData: Record<string, string | number | boolean> = {
      ...(body.additionalData ?? {}),
    }
    if (description) {
      additionalData.description = description
    }

    try {
      const client = createXiansClient()
      const data = await client.post<unknown>(
        `/api/v1/admin/secrets`,
        {
          key,
          value,
          tenantId,
          additionalData:
            Object.keys(additionalData).length > 0 ? additionalData : undefined,
        },
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
