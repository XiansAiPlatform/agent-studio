import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { createXiansClient, XiansApiError } from "@/lib/xians/client"

/**
 * GET /api/tenants/{tenantId}/integrations/{integrationId}/webhook-url
 * Returns the full (unmasked) webhook URL for copy operations.
 * Display should use the main GET integration which redacts for security.
 */
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const integrationId = pathParts[pathParts.length - 2] // webhook-url is last, integrationId is before it

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID is required' }, { status: 400 })
    }

    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/integrations/${integrationId}/webhook-url`
    const client = createXiansClient()
    const data = await client.get<{ webhookUrl: string }>(backendPath)

    if (!data?.webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL not found' }, { status: 404 })
    }

    // Build full URL if relative - do NOT redact (this endpoint is for copy)
    let fullUrl = data.webhookUrl
    if (data.webhookUrl.startsWith('/')) {
      const baseUrl = process.env.XIANS_SERVER_URL
      if (baseUrl) {
        fullUrl = `${baseUrl}${data.webhookUrl}`
      }
    }

    return NextResponse.json({ webhookUrl: fullUrl })
  } catch (error) {
    console.error('[API /integrations/webhook-url] Error:', error)
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { error: error.message, details: error.response },
        { status: error.status || 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch webhook URL' },
      { status: 500 }
    )
  }
})
