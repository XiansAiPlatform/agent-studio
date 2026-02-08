import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { createXiansClient, XiansApiError } from "@/lib/xians/client"

/**
 * GET /api/tenants/{tenantId}/integrations/{integrationId}
 * Fetches a single integration by ID from the backend API
 */
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const integrationId = pathParts[pathParts.length - 1]

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      )
    }

    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/integrations/${integrationId}`

    console.log(`[API /integrations/${integrationId}] Fetching integration from backend: ${backendPath}`)

    // Call the backend API
    const client = createXiansClient()
    const data = await client.get(backendPath)

    console.log(`[API /integrations/${integrationId}] ✅ Successfully fetched integration`)

    // Construct full webhook URL and redact secret
    if (data.webhookUrl) {
      // Construct full URL if it's a relative path
      let fullUrl = data.webhookUrl
      if (data.webhookUrl.startsWith('/')) {
        const baseUrl = process.env.XIANS_SERVER_URL
        if (baseUrl) {
          fullUrl = `${baseUrl}${data.webhookUrl}`
        }
      }
      
      // Redact the secret (last segment of the URL)
      const urlParts = fullUrl.split('/')
      if (urlParts.length > 0) {
        const lastSegment = urlParts[urlParts.length - 1]
        if (lastSegment && lastSegment.length > 8) {
          const redacted = lastSegment.slice(0, 4) + '****' + lastSegment.slice(-4)
          urlParts[urlParts.length - 1] = redacted
          fullUrl = urlParts.join('/')
        }
      }
      
      data.webhookUrl = fullUrl
      console.log(`[API /integrations/${integrationId}] Webhook URL processed: ${fullUrl}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`[API /integrations] ❌ Error:`, error)
    
    // Preserve backend error status and messages
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { 
          error: error.message,
          details: error.response
        },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch integration from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/tenants/{tenantId}/integrations/{integrationId}
 * Deletes an integration from the backend API
 */
export const DELETE = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const integrationId = pathParts[pathParts.length - 1]

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      )
    }

    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/integrations/${integrationId}`

    console.log(`[API DELETE /integrations/${integrationId}] Deleting integration from backend: ${backendPath}`)

    // Call the backend API
    const client = createXiansClient()
    await client.delete(backendPath)

    console.log(`[API DELETE /integrations/${integrationId}] ✅ Successfully deleted integration`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[API DELETE /integrations] ❌ Error:`, error)
    
    // Preserve backend error status and messages
    if (error instanceof XiansApiError) {
      return NextResponse.json(
        { 
          error: error.message,
          details: error.response
        },
        { status: error.status || 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete integration from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
