import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

function extractThumbprint(pathname: string): string | null {
  const match = pathname.match(/\/api\/developer\/agent-certificates\/([^/]+)\/revoke$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * POST /api/developer/agent-certificates/[thumbprint]/revoke
 * Revoke an agent certificate by thumbprint.
 * Body: { reason?: string }
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    // Identify the user by email so revoke scopes match the userId used when
    // generating/listing certificates.
    const userId = session.user?.email ?? session.user?.id
    const thumbprint = extractThumbprint(request.nextUrl.pathname)

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    if (!thumbprint) {
      return NextResponse.json({ error: 'Certificate thumbprint is required' }, { status: 400 })
    }

    let body: { reason?: string } = {}
    try {
      body = await request.json()
    } catch {
      // reason is optional
    }

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId })
      if (body.reason) params.set('reason', body.reason)

      await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-certificates/${encodeURIComponent(thumbprint)}/revoke?${params.toString()}`,
        undefined,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 200 })
    } catch (error) {
      return handleApiError(error, 'developer/agent-certificates revoke', {
        fallbackMessage: 'Failed to revoke agent certificate',
      })
    }
  }
)
