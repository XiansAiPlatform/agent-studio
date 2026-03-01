import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { createXiansClient, XiansApiError } from "@/lib/xians/client"

/**
 * GET /api/tenants/{tenantId}/webhooks
 * Lists webhook API keys for the tenant
 * Query params:
 * - agentName: Filter by agent name
 * - activationName: Filter by activation name
 */
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const { searchParams } = new URL(request.url)
    const agentName = searchParams.get('agentName')
    const activationName = searchParams.get('activationName')

    const params = new URLSearchParams()
    if (agentName) params.set('agentName', agentName)
    if (activationName) params.set('activationName', activationName)

    const queryString = params.toString()
    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/webhooks${queryString ? `?${queryString}` : ''}`

    const client = createXiansClient()
    const data = await client.get<{ webhooks: unknown[] }>(backendPath)

    // Build full webhook URLs (server returns relative paths)
    const baseUrl = process.env.XIANS_SERVER_URL
    const webhooks = Array.isArray(data?.webhooks) ? data.webhooks.map((w: any) => {
      if (w.webhookUrl && w.webhookUrl.startsWith('/') && baseUrl) {
        return { ...w, webhookUrl: `${baseUrl}${w.webhookUrl}` }
      }
      return w
    }) : []

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('[API /webhooks GET] Error:', error)
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { error: error.message, details: error.response },
        { status: error.status || 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/tenants/{tenantId}/webhooks
 * Creates a builtin webhook as an app integration (unified with app integrations API)
 * Request: CreateBuiltinWebhookRequest (activationName, agentName, name?, workflowName?, participantId?, timeoutInSeconds?, webhookName?, apiKey?)
 * Response: AppIntegrationResponse
 */
export const POST = withTenant(async (request, { tenantContext }) => {
  try {
    const body = await request.json()

    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/webhooks`

    const client = createXiansClient()
    const data = await client.post<any>(backendPath, body)

    // Build full webhook URL if relative (AppIntegrationResponse)
    if (data?.webhookUrl && data.webhookUrl.startsWith('/')) {
      const baseUrl = process.env.XIANS_SERVER_URL
      if (baseUrl) {
        data.webhookUrl = `${baseUrl}${data.webhookUrl}`
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API /webhooks POST] Error:', error)
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { error: error.message, details: error.response },
        { status: error.status || 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create webhook' },
      { status: 500 }
    )
  }
})
