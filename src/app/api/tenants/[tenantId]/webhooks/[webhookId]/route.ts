import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { createXiansClient, XiansApiError } from "@/lib/xians/client"

/**
 * DELETE /api/tenants/{tenantId}/webhooks/{webhookId}
 * Revokes a webhook API key
 */
export const DELETE = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const webhookId = pathParts[pathParts.length - 1]

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/webhooks/${webhookId}`

    const client = createXiansClient()
    await client.delete(backendPath)

    return NextResponse.json({ message: 'Webhook deleted successfully' })
  } catch (error) {
    console.error('[API /webhooks DELETE] Error:', error)
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { error: error.message, details: error.response },
        { status: error.status || 500 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete webhook' },
      { status: 500 }
    )
  }
})
