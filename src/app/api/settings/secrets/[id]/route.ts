import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { canManageSecretOwner, resolveSecretAccess } from '@/lib/api/secret-access'

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
