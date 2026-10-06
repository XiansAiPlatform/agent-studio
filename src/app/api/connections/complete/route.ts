import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { randomBytes } from "crypto"
import { withParticipantAdmin, ApiContext } from "@/lib/api/with-tenant"
import {
  OIDCConnection,
  UserTokenInfo
} from "@/app/(dashboard)/settings/connections/types"
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { unsealOAuthState } from '@/lib/mcp/oauth-state'
import { getOAuthCallbackUrl } from '@/lib/mcp/oauth-url'

const MCP_OAUTH_COOKIE = 'mcp-oauth-state'
const MCP_OAUTH_CONNECTION_KEY = 'MCP_OAUTH_CONNECTION'

interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string | string[]
  token_type?: string
}

interface SecretMetadata {
  id: string
}

async function exchangeOAuthCode(
  tokenUrl: string,
  resource: string,
  tokenEndpointAuthMethod: 'client_secret_post' | 'client_secret_basic',
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    resource,
  })
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (tokenEndpointAuthMethod === 'client_secret_basic') {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  } else {
    body.set('client_id', clientId)
    body.set('client_secret', clientSecret)
  }
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body,
  })
  if (!response.ok) throw new Error(`OAuth token exchange failed (${response.status})`)
  return response.json()
}

async function saveOAuthMcpConnection(
  tenantId: string,
  pending: ReturnType<typeof unsealOAuthState>,
  token: OAuthTokenResponse,
  redirectUri: string
): Promise<void> {
  const client = createXiansClient()
  const query = new URLSearchParams({
    key: MCP_OAUTH_CONNECTION_KEY,
    tenantId,
    agentId: pending.agentName,
    activationName: pending.activationName,
  })
  let existing: SecretMetadata | null = null
  try {
    existing = await client.get<SecretMetadata>(
      `/api/v1/admin/secrets/fetch?${query}`,
      { headers: { 'X-Tenant-Id': tenantId } }
    )
  } catch (error) {
    if (!(error instanceof XiansApiError) || error.status !== 404) throw error
  }
  if (existing) throw new Error('An OAuth MCP connection already exists for this activation')

  const value = {
    secretId: '',
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
    redirectUri,
    scopes: pending.scopes,
    tokens: {
      tokenType: token.token_type ?? 'Bearer',
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: Array.isArray(token.scope) ? token.scope.join(' ') : token.scope,
      obtainedAt: new Date().toISOString(),
    },
  }
  const scope = {
    tenantId,
    agentId: pending.agentName,
    activationName: pending.activationName,
  }
  const additionalData = {
    purpose: 'mcp-oauth',
    providerId: pending.providerId,
    name: pending.name,
    endpoint: pending.mcpUrl,
    status: 'connected',
  }

  const created = await client.post<SecretMetadata>('/api/v1/admin/secrets', {
    key: MCP_OAUTH_CONNECTION_KEY,
    value: JSON.stringify(value),
    ...scope,
    additionalData,
  }, { headers: { 'X-Tenant-Id': tenantId } })
  value.secretId = created.id
  await client.put(`/api/v1/admin/secrets/${encodeURIComponent(created.id)}`, {
    value: JSON.stringify(value),
    ...scope,
    additionalData,
  }, { headers: { 'X-Tenant-Id': tenantId } })
}

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
    accessToken: `${connection.providerId}_access_token_${randomBytes(24).toString('base64url')}`,
    refreshToken: `${connection.providerId}_refresh_token_${randomBytes(24).toString('base64url')}`,
    expiresAt: now + (expiresIn * 1000),
    scope: (connection.customScopes || []).join(' '),
    tokenType: 'Bearer',
    ...userInfo
  }
}

const getHandler = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connectionId')
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    const sealedState = request.cookies.get(MCP_OAUTH_COOKIE)?.value
    if (sealedState) {
      const pending = unsealOAuthState(sealedState)
      const currentUser = apiContext.session.user.email?.trim().toLowerCase()
      if (pending.state !== state || pending.userId !== currentUser || Date.now() - pending.createdAt > 600_000) {
        return NextResponse.redirect(new URL('/settings/connections?error=state_mismatch', request.url))
      }
      if (error) {
        return NextResponse.redirect(new URL(
          `/settings/connections?error=oauth_error&details=${encodeURIComponent(errorDescription || error)}`,
          request.url
        ))
      }
      if (!code) {
        return NextResponse.redirect(new URL('/settings/connections?error=missing_oauth_params', request.url))
      }

      try {
        const redirectUri = getOAuthCallbackUrl()
        const token = await exchangeOAuthCode(
          pending.tokenUrl,
          pending.mcpUrl,
          pending.tokenEndpointAuthMethod,
          code,
          redirectUri,
          pending.clientId,
          pending.clientSecret,
          pending.codeVerifier
        )
        await saveOAuthMcpConnection(tenantId, pending, token, redirectUri)
        const separator = pending.returnUrl.includes('?') ? '&' : '?'
        const response = NextResponse.redirect(new URL(
          `${pending.returnUrl}${separator}success=connection_created&name=${encodeURIComponent(pending.name)}`,
          request.url
        ))
        response.cookies.set(MCP_OAUTH_COOKIE, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/api/connections/complete',
          maxAge: 0,
        })
        return response
      } catch (tokenError) {
        console.error('Failed to connect OAuth MCP:', tokenError)
        return NextResponse.redirect(new URL('/settings/connections?error=token_exchange_failed', request.url))
      }
    }

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
