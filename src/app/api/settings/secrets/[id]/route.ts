import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { canManageSecretOwner, resolveSecretAccess } from '@/lib/api/secret-access'
import { handleApiError } from '@/lib/api/error-handler'
import {
  buildAdminSecretUpdatePayload,
  type TenantSecret,
} from '@/app/(dashboard)/settings/secrets/types'

/** Extract secret id from the URL path: /api/settings/secrets/{id} */
function extractSecretId(pathname: string): string | null {
  const match = pathname.match(/\/api\/settings\/secrets\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * DELETE /api/settings/secrets/[id]
 * Delete a secret. Server-side scope enforcement guarantees the caller may
 * only delete secrets that belong to their tenant. Deleting another member's
 * user-scoped secret additionally requires secrets:manage-user-scoped.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const id = extractSecretId(request.nextUrl.pathname)

    if (!id) {
      return NextResponse.json({ error: 'Secret id is required' }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const access = await resolveSecretAccess(session, tenantId)
      if (!access.canManageOtherUsers) {
        const secret = await client.get<{ userId?: string | null }>(
          `/api/v1/admin/secrets/${encodeURIComponent(id)}`,
          { headers: { 'X-Tenant-Id': tenantId } }
        )
        if (!canManageSecretOwner(access, secret?.userId)) {
          return NextResponse.json(
            { error: "You cannot delete another user's secret" },
            { status: 403 }
          )
        }
      }

      await client.delete<unknown>(
        `/api/v1/admin/secrets/${encodeURIComponent(id)}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      const apiErr = error instanceof XiansApiError ? error : null
      console.error('[settings/secrets DELETE] Failed:', error)
      return NextResponse.json(
        { error: apiErr?.message ?? 'Failed to delete secret' },
        { status: apiErr?.status ?? 500 }
      )
    }
  }
)

/**
 * PUT /api/settings/secrets/[id]
 * Replace a secret's value and, optionally, its description.
 *
 * Request body: { value: string, description?: string }
 *
 * The key and scope can't change here: scope fields are never forwarded.
 * Editing another member's user-scoped secret requires secrets:manage-user-scoped.
 */
export const PUT = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const id = extractSecretId(request.nextUrl.pathname)

    if (!id) {
      return NextResponse.json({ error: 'Secret id is required' }, { status: 400 })
    }

    let body: { value?: unknown; description?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    // Validate before any upstream call.
    const validation = buildAdminSecretUpdatePayload(body, null)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const path = `/api/v1/admin/secrets/${encodeURIComponent(id)}`
      const headers = { 'X-Tenant-Id': tenantId }

      // Always load the secret: needed for the owner check and to keep other additionalData keys.
      const secret = await client.get<Pick<TenantSecret, 'userId' | 'additionalData'>>(path, {
        headers,
      })

      const access = await resolveSecretAccess(session, tenantId)
      if (!canManageSecretOwner(access, secret?.userId)) {
        return NextResponse.json(
          { error: "You cannot edit another user's secret" },
          { status: 403 }
        )
      }

      const result = buildAdminSecretUpdatePayload(body, secret?.additionalData)
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      const data = await client.put<unknown>(path, result.payload, { headers })
      return NextResponse.json(data, { status: 200 })
    } catch (error) {
      return handleApiError(error, 'settings/secrets PUT', {
        fallbackMessage: 'Failed to update secret',
      })
    }
  }
)

