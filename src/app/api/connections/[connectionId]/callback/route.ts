import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { withTenantFromSession, ApiContext } from "@/lib/api/with-tenant"
import {
  ConnectionToken
} from "@/app/(dashboard)/settings/connections/types"

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
  if (!connection.providerId) {
    throw new Error('Invalid provider')
  }

  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  const now = Date.now()
  const expiresIn = 3600
  const defaultScopes = connection.providerId === 'slack'
    ? ['channels:read', 'chat:write', 'users:read']
    : ['email', 'profile']

  return {
    accessToken: `mock_access_token_${Math.random().toString(36).substr(2, 15)}`,
    refreshToken: `mock_refresh_token_${Math.random().toString(36).substr(2, 15)}`,
    expiresAt: now + (expiresIn * 1000),
    scope: (connection.customScopes || defaultScopes).join(' '),
    tokenType: 'Bearer'
  }
}

const getHandler = withTenantFromSession(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const pathParts = request.nextUrl.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 2]
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (!connectionId) {
      return redirect(`/settings/connections?error=missing_connection_id`)
    }

    if (error) {
      console.error('OAuth callback error:', error, errorDescription)
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

    if (connection.pendingState !== state) {
      console.error('OAuth state mismatch:', { expected: connection.pendingState, received: state })
      updateConnection(tenantId, connectionId, {
        status: 'error',
        lastError: 'OAuth state validation failed',
        lastErrorAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return redirect(`/settings/connections?error=state_mismatch`)
    }

    try {
      const tokens = await exchangeCodeForTokens(connection, code)
      const now = new Date().toISOString()
      updateConnection(tenantId, connectionId, {
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
      return redirect(`/settings/connections?success=connection_authorized&name=${encodeURIComponent(connection.name)}`)
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
    console.error('OAuth callback error:', error)
    return redirect(`/settings/connections?error=callback_failed`)
  }
})

// GET /api/connections/{connectionId}/callback
export const GET = getHandler

// POST /api/connections/{connectionId}/callback (some OAuth flows use POST callbacks)
export const POST = getHandler
