import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'

/**
 * GET /api/integrations
 * Fetches app integrations. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const params = new URLSearchParams()
      const platformId = searchParams.get('platformId')
      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      if (platformId) params.set('platformId', platformId)
      if (agentName) params.set('agentName', agentName)
      if (activationName) params.set('activationName', activationName)

      const queryString = params.toString()
      const backendPath = `/api/v1/admin/tenants/${tenantId}/integrations${queryString ? `?${queryString}` : ''}`

      const client = createXiansClient()
      const data = await client.get<any>(backendPath)

      const processedData = Array.isArray(data)
        ? data.map((integration: any) => {
            if (integration.webhookUrl) {
              let fullUrl = integration.webhookUrl
              if (integration.webhookUrl.startsWith('/')) {
                const baseUrl = process.env.XIANS_SERVER_URL
                if (baseUrl) fullUrl = `${baseUrl}${integration.webhookUrl}`
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
              integration.webhookUrl = fullUrl
            }
            return integration
          })
        : data

      return NextResponse.json(processedData)
    } catch (error) {
      if (error instanceof XiansApiError) {
        return NextResponse.json(
          { error: error.message, details: error.response },
          { status: error.status || 500 }
        )
      }
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to fetch integrations',
        },
        { status: 500 }
      )
    }
  }
)

/**
 * POST /api/integrations
 * Creates a new integration. Tenant is injected from session (httpOnly cookie).
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const body = await request.json()

      const backendPath = `/api/v1/admin/tenants/${tenantId}/integrations`
      const client = createXiansClient()
      const data = await client.post<any>(backendPath, body)

      if (data?.webhookUrl?.startsWith('/')) {
        const baseUrl = process.env.XIANS_SERVER_URL
        if (baseUrl) {
          data.webhookUrl = `${baseUrl}${data.webhookUrl}`
        }
      }

      return NextResponse.json(data)
    } catch (error) {
      if (error instanceof XiansApiError) {
        return NextResponse.json(
          { error: error.message, details: error.response },
          { status: error.status || 500 }
        )
      }
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to create integration',
        },
        { status: 500 }
      )
    }
  }
)
