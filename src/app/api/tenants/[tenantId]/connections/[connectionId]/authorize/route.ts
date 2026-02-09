import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
// Provider info now comes from the backend API
import { 
  AuthorizeConnectionRequest,
  AuthorizeConnectionResponse 
} from "@/app/(dashboard)/settings/connections/types"

// Mock data storage - use shared storage
function getMockStorage(): Record<string, any[]> {
  if (typeof global !== 'undefined' && (global as any).mockConnections) {
    return (global as any).mockConnections
  }
  return {}
}

function findConnectionById(tenantId: string, connectionId: string) {
  const storage = getMockStorage()
  const connections = storage[tenantId] || []
  return connections.find(conn => conn.id === connectionId)
}

function generateState(): string {
  return Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15)
}

// POST /api/tenants/{tenantId}/connections/{connectionId}/authorize
export const POST = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 2] // authorize is the last part
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    const requestData: AuthorizeConnectionRequest = await request.json()

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const authResponse = await xians.connections.initiateOAuth(tenantContext.tenant.id, connectionId, requestData)
    
    // Mock implementation
    const connection = findConnectionById(tenantContext.tenant.id, connectionId)
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Basic validation
    if (!connection.providerId) {
      return NextResponse.json(
        { error: 'Invalid provider configuration' },
        { status: 400 }
      )
    }

    // Generate state for OAuth flow security
    const state = generateState()
    
    // Build OAuth authorization URL
    const scopes = connection.customScopes || []
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/tenants/${tenantContext.tenant.id}/connections/${connectionId}/callback`
    
    let authUrl: string

    // Mock OAuth URLs based on provider
    switch (connection.providerId) {
      case 'sharepoint':
      case 'outlook365':
        // Microsoft OAuth endpoint
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `prompt=consent`
        break
        
      case 'google-workspace':
        // Google OAuth endpoint
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `access_type=offline&` +
          `prompt=consent`
        break
        
      case 'slack':
        // Slack OAuth endpoint
        authUrl = `https://slack.com/oauth/v2/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(','))}&` +
          `state=${encodeURIComponent(state)}`
        break
        
      case 'github':
        // GitHub OAuth endpoint
        authUrl = `https://github.com/login/oauth/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
        break
        
      case 'notion':
        // Notion OAuth endpoint
        authUrl = `https://api.notion.com/v1/oauth/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `state=${encodeURIComponent(state)}`
        break
        
      default:
        // Generic OIDC endpoint
        const wellKnownUrl = connection.wellKnownUrl
        if (!wellKnownUrl) {
          return NextResponse.json(
            { error: 'Well-known URL not configured for this provider' },
            { status: 400 }
          )
        }
        authUrl = wellKnownUrl.replace('/.well-known/openid-configuration', '/oauth2/authorize') +
          `?client_id=${encodeURIComponent(connection.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
    }

    // Store state for validation (in production, this would be in secure storage)
    connection.pendingState = state
    connection.status = 'authorizing'
    connection.updatedAt = new Date().toISOString()

    const response: AuthorizeConnectionResponse = {
      authUrl,
      state
    }
    
    return Response.json(response)
  } catch (error) {
    console.error('Failed to initiate OAuth authorization:', error)
    return NextResponse.json(
      { error: 'Failed to initiate authorization' },
      { status: 500 }
    )
  }
})