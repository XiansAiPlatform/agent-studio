import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { createXiansClient } from '@/lib/xians/client'

/**
 * POST /api/integrations/{integrationId}/enable
 * Enables an integration. Tenant is injected from session (httpOnly cookie).
 */
export const POST = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<{ integrationId: string }>) => {
    const integrationId = encodeSafePathSegment(params.integrationId)
    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required and must be a valid identifier' },
        { status: 400 }
      )
    }

    const tenantId = tenantContext.tenant.id
    const backendPath = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/integrations/${integrationId}/enable`

    const client = createXiansClient()
    await client.post<unknown>(backendPath)

    return NextResponse.json({ success: true })
  }
)
