import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { withTenant } from "@/lib/api/with-tenant"
import { getProviderById } from "@/config/oidc-providers"
import { 
  ConnectionCallbackRequest,
  ConnectionToken 
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

function updateConnection(tenantId: string, connectionId: string, updates: any) {
  const storage = getMockStorage()
  const connections = storage[tenantId] || []
  const index = connections.findIndex(conn => conn.id === connectionId)
  if (index !== -1) {
    connections[index] = { ...connections[index], ...updates }
  }
}

async function exchangeCodeForTokens(connection: any, code: string): Promise<ConnectionToken> {
  // In production, this would make actual OAuth token exchange requests
  // For mock purposes, we'll simulate successful token exchange
  
  const provider = getProviderById(connection.providerId)
  if (!provider) {
    throw new Error('Invalid provider')
  }

  // Simulate token exchange delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  // Mock token response
  const now = Date.now()
  const expiresIn = 3600 // 1 hour in seconds
  
  return {
    accessToken: `mock_access_token_${Math.random().toString(36).substr(2, 15)}`,
    refreshToken: `mock_refresh_token_${Math.random().toString(36).substr(2, 15)}`,
    expiresAt: now + (expiresIn * 1000),
    scope: (connection.customScopes || provider.defaultScopes).join(' '),
    tokenType: 'Bearer'
  }
}

// GET /api/tenants/{tenantId}/connections/{connectionId}/callback
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 2] // callback is the last part
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (!connectionId) {
      return redirect(`/settings/connections?error=missing_connection_id`)
    }

    // Handle OAuth errors
    if (error) {
      console.error('OAuth callback error:', error, errorDescription)
      
      // Update connection status
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'error',
        lastError: errorDescription || error,
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return redirect(`/settings/connections?error=oauth_error&details=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!code || !state) {
      return redirect(`/settings/connections?error=missing_oauth_params`)
    }

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const result = await xians.connections.handleOAuthCallback(tenantContext.tenant.id, connectionId, { code, state })
    
    // Mock implementation
    const connection = findConnectionById(tenantContext.tenant.id, connectionId)
    
    if (!connection) {
      return redirect(`/settings/connections?error=connection_not_found`)
    }

    // Validate state parameter
    if (connection.pendingState !== state) {
      console.error('OAuth state mismatch:', { expected: connection.pendingState, received: state })
      
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'error',
        lastError: 'OAuth state validation failed',
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return redirect(`/settings/connections?error=state_mismatch`)
    }

    try {
      // Exchange authorization code for access tokens
      const tokens = await exchangeCodeForTokens(connection, code)
      
      // Update connection with tokens and success status
      const now = new Date().toISOString()
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'connected',
        hasValidToken: true,
        tokenExpiresAt: new Date(tokens.expiresAt).toISOString(),
        lastTokenRefresh: now,
        updatedAt: now,
        lastError: undefined,
        lastErrorAt: undefined,
        pendingState: undefined,
        usageCount: connection.usageCount || 0
      })
      
      // Redirect to connections page with success message
      return redirect(`/settings/connections?success=connection_authorized&name=${encodeURIComponent(connection.name)}`)
      
    } catch (tokenError) {
      console.error('Failed to exchange code for tokens:', tokenError)
      
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'error',
        lastError: 'Failed to exchange authorization code for access tokens',
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingState: undefined
      })
      
      return redirect(`/settings/connections?error=token_exchange_failed`)
    }
    
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirect(`/settings/connections?error=callback_failed`)
  }
})

// Handle POST requests as well (some OAuth flows use POST callbacks)
export const POST = GET