import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

function extractId(pathname: string): string | null {
  const match = pathname.match(/\/api\/developer\/admin-apikeys\/([^/]+)\/rotate$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * POST /api/developer/admin-apikeys/[id]/rotate
 * Rotate an admin API key — invalidates the current key and issues a new one.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const userId = session.user?.email ?? session.user?.id
    const id = extractId(request.nextUrl.pathname)

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId })
      const data = await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/admin-apikeys/${encodeURIComponent(id)}/rotate?${params.toString()}`,
        undefined,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'developer/admin-apikeys rotate', {
        fallbackMessage: 'Failed to rotate admin API key',
      })
    }
  }
)
