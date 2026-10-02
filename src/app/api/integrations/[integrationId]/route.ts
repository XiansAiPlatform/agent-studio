import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { createXiansClient } from '@/lib/xians/client'

type IntegrationParams = { integrationId: string }

function requireIntegrationId(raw: string | undefined): string | NextResponse {
  const integrationId = encodeSafePathSegment(raw)
  if (!integrationId) {
    return NextResponse.json(
      { error: 'integrationId is required and must be a valid identifier' },
      { status: 400 }
    )
  }
  return integrationId
}

/**
 * GET /api/integrations/{integrationId}
 * Fetches a single integration. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<IntegrationParams>) => {
    const integrationId = requireIntegrationId(params.integrationId)
    if (integrationId instanceof NextResponse) return integrationId

    const tenantId = tenantContext.tenant.id
    const backendPath = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/integrations/${integrationId}`

    const client = createXiansClient()
    const data = await client.get<{ webhookUrl?: string } & Record<string, unknown>>(backendPath)

    if (data?.webhookUrl) {
      let fullUrl = data.webhookUrl
      if (data.webhookUrl.startsWith('/')) {
        const baseUrl = process.env.XIANS_SERVER_URL
        if (baseUrl) fullUrl = `${baseUrl}${data.webhookUrl}`
      }
      const urlParts = fullUrl.split('/')
      if (urlParts.length > 0) {
        const lastSegment = urlParts[urlParts.length - 1]
        if (lastSegment && lastSegment.length > 8) {
          urlParts[urlParts.length - 1] =
            lastSegment.slice(0, 4) + '****' + lastSegment.slice(-4)
          fullUrl = urlParts.join('/')
        }
      }
      data.webhookUrl = fullUrl
    }

    return NextResponse.json(data)
  }
)

/**
 * DELETE /api/integrations/{integrationId}
 * Deletes an integration. Tenant is injected from session (httpOnly cookie).
 */
export const DELETE = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<IntegrationParams>) => {
    const integrationId = requireIntegrationId(params.integrationId)
    if (integrationId instanceof NextResponse) return integrationId

    const tenantId = tenantContext.tenant.id
    const backendPath = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/integrations/${integrationId}`

    const client = createXiansClient()
    await client.delete<unknown>(backendPath)

    return NextResponse.json({ success: true })
  }
)
