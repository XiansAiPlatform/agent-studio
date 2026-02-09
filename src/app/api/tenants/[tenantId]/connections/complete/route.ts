import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { withTenant } from "@/lib/api/with-tenant"
// Provider info now comes from the backend API
import { 
  OIDCConnection,
  UserTokenInfo
} from "@/app/(dashboard)/settings/connections/types"

// Shared mock storage
function getMockStorage(): Record<string, OIDCConnection[]> {
  if (typeof global !== 'undefined' && (global as any).mockConnections) {
    return (global as any).mockConnections
  }
  return {}
}

function findConnectionById(tenantId: string, connectionId: string): OIDCConnection | undefined {
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
    storage[tenantId] = connections
  }
}

async function exchangeCodeForTokens(
  connection: any, 
  code: string, 
  redirectUri: string
): Promise<UserTokenInfo> {
  // In production, this would make actual OAuth token exchange requests
  // For mock purposes, we'll simulate successful token exchange with user info
  
  // Basic validation
  if (!connection.providerId) {
    throw new Error('Invalid provider')
  }

  // Simulate token exchange delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  const now = Date.now()
  const expiresIn = 3600 // 1 hour in seconds
  
  // Mock user information based on provider
  let userInfo = {
    externalUserId: 'user123',
    externalUserName: 'John Doe',
    externalUserEmail: 'john.doe@example.com'
  }

  switch (connection.providerId) {
    case 'sharepoint':
    case 'outlook365':
      userInfo = {
        externalUserId: 'user@company.onmicrosoft.com',
        externalUserName: 'John Doe',
        externalUserEmail: 'john.doe@company.com'
      }
      break
    case 'google-workspace':
      userInfo = {
        externalUserId: '1234567890123456789',
        externalUserName: 'John Doe',
        externalUserEmail: 'john.doe@company.com'
      }
      break
    case 'slack':
      userInfo = {
        externalUserId: 'U1234567890',
        externalUserName: 'John Doe',
        externalUserEmail: 'john.doe@company.slack.com'
      }
      break
    case 'github':
      userInfo = {
        externalUserId: 'johndoe123',
        externalUserName: 'John Doe',
        externalUserEmail: 'john.doe@users.noreply.github.com'
      }
      break
    case 'notion':
      userInfo = {
        externalUserId: 'f7acc12f-a5bb-4079-b2e2-37dc55c2e2be',
        externalUserName: 'John Doe',
        externalUserEmail: 'john.doe@company.com'
      }
      break
  }

  return {
    accessToken: `${connection.providerId}_access_token_${Math.random().toString(36).substr(2, 15)}`,
    refreshToken: `${connection.providerId}_refresh_token_${Math.random().toString(36).substr(2, 15)}`,
    expiresAt: now + (expiresIn * 1000),
    scope: (connection.customScopes || []).join(' '),
    tokenType: 'Bearer',
    ...userInfo
  }
}

// GET /api/tenants/{tenantId}/connections/complete
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connectionId')
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (!connectionId) {
      return redirect(`/settings/connections?error=missing_connection_id`)
    }

    // Handle OAuth errors
    if (error) {
      console.error('OAuth completion error:', error, errorDescription)
      
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
    // const result = await xians.connections.completeConnection(tenantContext.tenant.id, { connectionId, code, state })
    
    // Mock implementation
    const connection = findConnectionById(tenantContext.tenant.id, connectionId)
    
    if (!connection) {
      return redirect(`/settings/connections?error=connection_not_found`)
    }

    // Validate state parameter
    if ((connection as any).pendingState !== state) {
      console.error('OAuth state mismatch:', { expected: (connection as any).pendingState, received: state })
      
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'error',
        lastError: 'OAuth state validation failed',
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return redirect(`/settings/connections?error=state_mismatch`)
    }

    try {
      // Exchange authorization code for access tokens and get user info
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/tenants/${tenantContext.tenant.id}/connections/complete?connectionId=${connectionId}`
      const tokenInfo = await exchangeCodeForTokens(connection, code, redirectUri)
      
      // Update connection with tokens and user information
      const now = new Date().toISOString()
      updateConnection(tenantContext.tenant.id, connectionId, {
        status: 'connected',
        hasValidToken: true,
        tokenExpiresAt: new Date(tokenInfo.expiresAt).toISOString(),
        lastTokenRefresh: now,
        authorizedAt: now,
        updatedAt: now,
        lastError: undefined,
        lastErrorAt: undefined,
        pendingState: undefined,
        externalUserId: tokenInfo.externalUserId,
        externalUserName: tokenInfo.externalUserName,
        usageCount: 0
      })
      
      // In production, store the actual tokens securely in the backend
      // await xians.connections.storeUserTokens(connectionId, {
      //   accessToken: tokenInfo.accessToken,
      //   refreshToken: tokenInfo.refreshToken,
      //   expiresAt: tokenInfo.expiresAt,
      //   scope: tokenInfo.scope
      // })
      
      // Redirect to connections page with success message
      return redirect(`/settings/connections?success=connection_created&name=${encodeURIComponent(connection.name)}&user=${encodeURIComponent(tokenInfo.externalUserName || 'Unknown User')}`)
      
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
    console.error('OAuth completion error:', error)
    return redirect(`/settings/connections?error=completion_failed`)
  }
})

// Handle POST requests as well (some OAuth flows use POST callbacks)
export const POST = GET