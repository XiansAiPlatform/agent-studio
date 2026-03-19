import { NextRequest, NextResponse } from "next/server"
import { withParticipantAdmin, ApiContext } from "@/lib/api/with-tenant"
import {
  InitiateConnectionRequest,
  InitiateConnectionResponse,
  OIDCConnection,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

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
  return Math.random().toString(36).substr(2, 9)
}

function generateState(): string {
  return Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15)
}

// POST /api/connections/initiate
export const POST = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const data: InitiateConnectionRequest = await request.json()

    if (!data.providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    if (!data.name || !data.clientId || !data.clientSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: name, clientId, clientSecret' },
        { status: 400 }
      )
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
        if (!wellKnownUrl) {
          return NextResponse.json(
            { error: 'Well-known URL is required for generic OIDC providers' },
            { status: 400 }
          )
        }
        authUrl = wellKnownUrl.replace('/.well-known/openid-configuration', '/oauth2/authorize') +
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
