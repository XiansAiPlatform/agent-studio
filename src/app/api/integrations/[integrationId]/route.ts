import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'

/**
 * GET /api/integrations/{integrationId}
 * Fetches a single integration. Tenant is injected from session (httpOnly cookie).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string }> }
) {
  const handler = withTenantFromSession(
    async (req: NextRequest, { tenantContext }: ApiContext) => {
      const { integrationId } = await context.params
      if (!integrationId) {
        return NextResponse.json(
          { error: 'Integration ID is required' },
          { status: 400 }
        )
      }

      const tenantId = tenantContext.tenant.id
      const backendPath = `/api/v1/admin/tenants/${tenantId}/integrations/${integrationId}`

      const client = createXiansClient()
      const data = await client.get<any>(backendPath)

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
  return handler(request)
}

/**
 * DELETE /api/integrations/{integrationId}
 * Deletes an integration. Tenant is injected from session (httpOnly cookie).
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ integrationId: string }> }
) {
  const handler = withTenantFromSession(
    async (req: NextRequest, { tenantContext }: ApiContext) => {
      const { integrationId } = await context.params
      if (!integrationId) {
        return NextResponse.json(
          { error: 'Integration ID is required' },
          { status: 400 }
        )
      }

      const tenantId = tenantContext.tenant.id
      const backendPath = `/api/v1/admin/tenants/${tenantId}/integrations/${integrationId}`

      const client = createXiansClient()
      await client.delete<any>(backendPath)

      return NextResponse.json({ success: true })
    }
  )
  return handler(request)
}
