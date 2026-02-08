import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { createXiansClient, XiansApiError } from "@/lib/xians/client"

/**
 * GET /api/tenants/{tenantId}/integrations
 * Fetches integrations from the backend API with optional filters
 * Query params:
 * - agentName: Filter by agent name
 * - activationName: Filter by activation name
 */
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const { searchParams } = new URL(request.url)
    const agentName = searchParams.get('agentName')
    const activationName = searchParams.get('activationName')

    // Build query parameters for backend API
    const params = new URLSearchParams()
    if (agentName) {
      params.set('agentName', agentName)
    }
    if (activationName) {
      params.set('activationName', activationName)
    }

    const queryString = params.toString()
    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/integrations${queryString ? `?${queryString}` : ''}`

    console.log(`[API /integrations] Fetching integrations from backend: ${backendPath}`)

    // Call the backend API
    const client = createXiansClient()
    const data = await client.get(backendPath)

    console.log(`[API /integrations] ✅ Successfully fetched ${Array.isArray(data) ? data.length : 0} integrations`)

    // Process integrations to construct full webhook URLs and redact secrets
    const processedData = Array.isArray(data) ? data.map(integration => {
      if (integration.webhookUrl) {
        // Construct full URL if it's a relative path
        let fullUrl = integration.webhookUrl
        if (integration.webhookUrl.startsWith('/')) {
          const baseUrl = process.env.XIANS_SERVER_URL
          if (baseUrl) {
            fullUrl = `${baseUrl}${integration.webhookUrl}`
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
        
        integration.webhookUrl = fullUrl
      }
      return integration
    }) : data

    return NextResponse.json(processedData)
  } catch (error) {
    console.error('[API /integrations] ❌ Error:', error)
    
    // Preserve backend error messages
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
        error: error instanceof Error ? error.message : 'Failed to fetch integrations from backend',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/tenants/{tenantId}/integrations
 * Creates a new integration
 */
export const POST = withTenant(async (request, { tenantContext }) => {
  try {
    const body = await request.json()
    
    const backendPath = `/api/v1/admin/tenants/${tenantContext.tenant.id}/integrations`
    
    console.log(`[API /integrations POST] Creating integration at: ${backendPath}`)
    console.log(`[API /integrations POST] Request body:`, JSON.stringify(body, null, 2))

    // Call the backend API
    const client = createXiansClient()
    const data = await client.post(backendPath, body)

    console.log(`[API /integrations POST] ✅ Successfully created integration:`, data)

    // Construct full webhook URL if it's a relative path
    if (data.webhookUrl && data.webhookUrl.startsWith('/')) {
      const baseUrl = process.env.XIANS_SERVER_URL
      if (baseUrl) {
        data.webhookUrl = `${baseUrl}${data.webhookUrl}`
        console.log(`[API /integrations POST] Constructed full webhook URL: ${data.webhookUrl}`)
      }
    }
    
    // Don't redact for wizard response - wizard needs full URL for Slack configuration
    // Redaction only happens in GET endpoint for display purposes

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API /integrations POST] ❌ Error:', error)
    
    // Preserve backend error messages
    if (error instanceof XiansApiError) {
      // XiansApiError already has the backend error message
      return NextResponse.json(
        { 
          error: error.message,
          details: error.response
        },
        { status: error.status || 500 }
      )
    }
    
    // For other errors, return generic message
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})
