import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { withTenantFromSession, ApiContext } from "@/lib/api/with-tenant"
import {
  OIDCConnection,
  UserTokenInfo
} from "@/app/(dashboard)/settings/connections/types"

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
  if (!connection.providerId) {
    throw new Error('Invalid provider')
  }

  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  const now = Date.now()
  const expiresIn = 3600

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

const getHandler = withTenantFromSession(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connectionId')
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (!connectionId) {
      return redirect(`/settings/connections?error=missing_connection_id`)
    }

    if (error) {
      console.error('OAuth completion error:', error, errorDescription)
      updateConnection(tenantId, connectionId, {
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

    const connection = findConnectionById(tenantId, connectionId)

    if (!connection) {
      return redirect(`/settings/connections?error=connection_not_found`)
    }

    if ((connection as any).pendingState !== state) {
      console.error('OAuth state mismatch:', { expected: (connection as any).pendingState, received: state })
      updateConnection(tenantId, connectionId, {
        status: 'error',
        lastError: 'OAuth state validation failed',
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return redirect(`/settings/connections?error=state_mismatch`)
    }

    try {
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/connections/complete?connectionId=${connectionId}`
      const tokenInfo = await exchangeCodeForTokens(connection, code, redirectUri)

      const now = new Date().toISOString()
      updateConnection(tenantId, connectionId, {
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

      return redirect(`/settings/connections?success=connection_created&name=${encodeURIComponent(connection.name)}&user=${encodeURIComponent(tokenInfo.externalUserName || 'Unknown User')}`)
    } catch (tokenError) {
      console.error('Failed to exchange code for tokens:', tokenError)
      updateConnection(tenantId, connectionId, {
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

// GET /api/connections/complete
export const GET = getHandler

// POST /api/connections/complete (some OAuth flows use POST callbacks)
export const POST = getHandler
