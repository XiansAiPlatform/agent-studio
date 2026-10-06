import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import { withParticipantAdmin, ApiContext } from "@/lib/api/with-tenant"
import { validateWellKnownUrl } from "@/lib/security/url"
import { parseJsonBody } from "@/lib/api/validate"
import { InitiateConnectionSchema } from "@/lib/api/schemas/connections"
import {
  InitiateConnectionResponse,
  OIDCConnection,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"
import { sealOAuthState } from "@/lib/mcp/oauth-state"
import { getOAuthCallbackUrl } from '@/lib/mcp/oauth-url'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { discoverMcpOAuth } from '@/lib/mcp/oauth-discovery'
import { oauthMcpConnectionKey } from '@/lib/mcp/connection-key'

const MCP_OAUTH_COOKIE = 'mcp-oauth-state'

async function oauthMcpConnectionExists(
  tenantId: string,
  agentName: string,
  activationName: string,
  connectionKey: string
): Promise<boolean> {
  const query = new URLSearchParams({
    key: connectionKey,
    tenantId,
    agentId: agentName,
    activationName,
  })
  try {
    await createXiansClient().get(`/api/v1/admin/secrets/fetch?${query}`, {
      headers: { 'X-Tenant-Id': tenantId },
    })
    return true
  } catch (error) {
    if (error instanceof XiansApiError && error.status === 404) return false
    throw error
  }
}

function getMockStorage(): Record<string, OIDCConnection[]> {
  if (typeof global !== 'undefined' && (global as any).mockConnections) {
    return (global as any).mockConnections
  }
  return {}
}

function saveMockConnections(tenantId: string, connections: OIDCConnection[]) {
  const storage = getMockStorage()
  storage[tenantId] = connections
}

function getMockConnections(tenantId: string): OIDCConnection[] {
  const storage = getMockStorage()
  return storage[tenantId] || []
}

function generateId(): string {
  return randomBytes(9).toString('base64url')
}

function generateState(): string {
  return randomBytes(32).toString('hex')
}

// GET /api/connections/initiate
export const GET = withParticipantAdmin(async () => {
  try {
    return NextResponse.json({ callbackUrl: getOAuthCallbackUrl() })
  } catch (error) {
    console.error('Failed to resolve OAuth callback URL:', error)
    return NextResponse.json({ error: 'OAuth callback URL is not configured' }, { status: 500 })
  }
})

// POST /api/connections/initiate
export const POST = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id

    const parsed = await parseJsonBody(request, InitiateConnectionSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    if (data.providerId === 'oauth-mcp') {
      if (!apiContext.tenantContext.permissions.includes('write')) {
        return NextResponse.json({ error: 'Permission denied: write required' }, { status: 403 })
      }

      if (!data.agentName || !data.activationName) {
        return NextResponse.json(
          { error: 'Select an agent activation before connecting an OAuth MCP server' },
          { status: 400 }
        )
      }

      const userId = apiContext.session.user.email?.trim().toLowerCase()
      if (!userId) return NextResponse.json({ error: 'User email is required' }, { status: 400 })

      const connectionKey = oauthMcpConnectionKey(data.name)
      if (await oauthMcpConnectionExists(tenantId, data.agentName, data.activationName, connectionKey)) {
        return NextResponse.json(
          { error: `Connection key ${connectionKey} already exists in this activation. Use a different connection name.` },
          { status: 409 }
        )
      }

      const mcpUrl = data.mcpUrl!
      let oauth
      try {
        oauth = await discoverMcpOAuth(mcpUrl)
      } catch (error) {
        console.error('OAuth MCP discovery failed:', error)
        const message = error instanceof Error ? error.message : 'Unknown discovery error'
        return NextResponse.json({ error: `OAuth discovery failed: ${message}` }, { status: 400 })
      }

      const state = generateState()
      const codeVerifier = randomBytes(48).toString('base64url')
      const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
      const connectionId = `conn_${generateId()}`
      const redirectUri = getOAuthCallbackUrl()
      const authUrl = new URL(oauth.authorizationUrl)
      let returnUrl = '/settings/connections'
      if (data.returnUrl?.startsWith('/') && !data.returnUrl.startsWith('//')) returnUrl = data.returnUrl
      authUrl.searchParams.set('client_id', data.clientId)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('code_challenge', codeChallenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('resource', mcpUrl)
      if (oauth.scopes.length) authUrl.searchParams.set('scope', oauth.scopes.join(' '))

      const response = NextResponse.json<InitiateConnectionResponse>({
        connectionId,
        authUrl: authUrl.toString(),
        state,
      })
      response.cookies.set(MCP_OAUTH_COOKIE, sealOAuthState({
        state,
        name: data.name,
        connectionKey,
        providerId: 'oauth-mcp',
        mcpUrl,
        authorizationUrl: oauth.authorizationUrl,
        tokenUrl: oauth.tokenUrl,
        scopes: oauth.scopes,
        tokenEndpointAuthMethod: oauth.tokenEndpointAuthMethod,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        codeVerifier,
        agentName: data.agentName,
        activationName: data.activationName,
        userId,
        returnUrl,
        createdAt: Date.now(),
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/connections/complete',
        maxAge: 600,
      })
      return response
    }

    const now = new Date().toISOString()
    const connectionId = `conn_${generateId()}`
    const state = generateState()

    const pendingConnection: OIDCConnection = {
      id: connectionId,
      tenantId,
      userId: apiContext.session.user.id,
      name: data.name,
      providerId: data.providerId,
      clientId: data.clientId,
      customScopes: data.customScopes,
      wellKnownUrl: data.wellKnownUrl,
      status: 'pending' as ConnectionStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: apiContext.session.user.email || apiContext.session.user.id,
      hasValidToken: false,
      description: data.description,
      isActive: true,
      usageCount: 0,
    }

    const connections = getMockConnections(tenantId)
    ;(pendingConnection as any).pendingState = state
    ;(pendingConnection as any).clientSecret = data.clientSecret
    connections.push(pendingConnection)
    saveMockConnections(tenantId, connections)

    const scopes = data.customScopes || []
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connections/complete?connectionId=${connectionId}`

    let authUrl: string

    switch (data.providerId) {
      case 'sharepoint':
      case 'outlook365':
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `prompt=consent`
        break

      case 'google-workspace':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `access_type=offline&` +
          `prompt=consent`
        break

      case 'slack':
        authUrl = `https://slack.com/oauth/v2/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(','))}&` +
          `state=${encodeURIComponent(state)}&` +
          `user_scope=identity.basic,identity.email`
        break

      case 'github':
        authUrl = `https://github.com/login/oauth/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
        break

      case 'notion':
        authUrl = `https://api.notion.com/v1/oauth/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `state=${encodeURIComponent(state)}&` +
          `owner=user`
        break

      default:
        const wellKnownUrl = data.wellKnownUrl
        const wellKnownValidation = validateWellKnownUrl(wellKnownUrl)
        if (!wellKnownValidation.ok) {
          return NextResponse.json(
            {
              error:
                wellKnownValidation.reason ||
                'Well-known URL is required for generic OIDC providers',
            },
            { status: 400 }
          )
        }
        authUrl = wellKnownValidation.url!
          .toString()
          .replace('/.well-known/openid-configuration', '/oauth2/authorize') +
          `?client_id=${encodeURIComponent(data.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
    }

    const response: InitiateConnectionResponse = {
      connectionId,
      authUrl,
      state,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to initiate connection:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
})
