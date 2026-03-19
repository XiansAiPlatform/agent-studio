import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'

/**
 * GET /api/integrations/{integrationId}/webhook-url
 * Returns the full (unmasked) webhook URL for copy operations.
 * Tenant is injected from session (httpOnly cookie).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string }> }
) {
  const handler = withParticipantAdmin(
    async (req: NextRequest, { tenantContext }: ApiContext) => {
      const { integrationId } = await context.params
      if (!integrationId) {
        return NextResponse.json(
          { error: 'Integration ID is required' },
          { status: 400 }
        )
      }

      const tenantId = tenantContext.tenant.id
      const backendPath = `/api/v1/admin/tenants/${tenantId}/integrations/${integrationId}/webhook-url`

      const client = createXiansClient()
      const data = await client.get<{ webhookUrl: string }>(backendPath)

      if (!data?.webhookUrl) {
        return NextResponse.json(
          { error: 'Webhook URL not found' },
          { status: 404 }
        )
      }

      let fullUrl = data.webhookUrl
      if (data.webhookUrl.startsWith('/')) {
        const baseUrl = process.env.XIANS_SERVER_URL
        if (baseUrl) fullUrl = `${baseUrl}${data.webhookUrl}`
      }

      return NextResponse.json({ webhookUrl: fullUrl })
    }
  )
  return handler(request)
}
