import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { getProviderById } from "@/config/oidc-providers"
import { 
  InitiateConnectionRequest,
  InitiateConnectionResponse,
  OIDCConnection,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

// Shared mock storage
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

// POST /api/tenants/{tenantId}/connections/initiate
export const POST = withTenant(async (request, { tenantContext, session }) => {
  try {
    const data: InitiateConnectionRequest = await request.json()
    
    // Validate provider ID
    const provider = getProviderById(data.providerId)
    if (!provider) {
      return NextResponse.json(
        { error: 'Invalid provider ID' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!data.name || !data.clientId || !data.clientSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: name, clientId, clientSecret' },
        { status: 400 }
      )
    }

    // In production, this would call the Xians backend to create a pending connection
    // const xians = createXiansSDK((session as any).accessToken)
    // const result = await xians.connections.initiateConnection(tenantContext.tenant.id, data)
    
    // Mock implementation - Create a pending connection
    const now = new Date().toISOString()
    const connectionId = `conn_${generateId()}`
    const state = generateState()
    
    const pendingConnection: OIDCConnection = {
      id: connectionId,
      tenantId: tenantContext.tenant.id,
      userId: session.user.id,
      name: data.name,
      providerId: data.providerId,
      clientId: data.clientId,
      // clientSecret is stored securely in backend, not returned in API
      customScopes: data.customScopes,
      wellKnownUrl: data.wellKnownUrl,
      status: 'pending' as ConnectionStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: session.user.email || session.user.id,
      hasValidToken: false,
      description: data.description,
      isActive: true,
      usageCount: 0,
    }

    // Store pending connection with OAuth state
    const connections = getMockConnections(tenantContext.tenant.id)
    ;(pendingConnection as any).pendingState = state
    ;(pendingConnection as any).clientSecret = data.clientSecret // Store temporarily for OAuth
    connections.push(pendingConnection)
    saveMockConnections(tenantContext.tenant.id, connections)

    // Build OAuth authorization URL
    const scopes = data.customScopes || provider.defaultScopes
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/tenants/${tenantContext.tenant.id}/connections/complete?connectionId=${connectionId}`
    
    let authUrl: string

    // Build OAuth URLs based on provider
    switch (data.providerId) {
      case 'sharepoint':
      case 'outlook365':
        // Microsoft OAuth endpoint
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `prompt=consent`
        break
        
      case 'google-workspace':
        // Google OAuth endpoint
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
        // Slack OAuth endpoint
        authUrl = `https://slack.com/oauth/v2/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(','))}&` +
          `state=${encodeURIComponent(state)}&` +
          `user_scope=identity.basic,identity.email`
        break
        
      case 'github':
        // GitHub OAuth endpoint
        authUrl = `https://github.com/login/oauth/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
        break
        
      case 'notion':
        // Notion OAuth endpoint
        authUrl = `https://api.notion.com/v1/oauth/authorize?` +
          `client_id=${encodeURIComponent(data.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `state=${encodeURIComponent(state)}&` +
          `owner=user`
        break
        
      default:
        // Generic OIDC endpoint
        const wellKnownUrl = data.wellKnownUrl || provider.wellKnownUrl
        authUrl = wellKnownUrl.replace('/.well-known/openid_configuration', '/oauth2/authorize') +
          `?client_id=${encodeURIComponent(data.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
    }

    const response: InitiateConnectionResponse = {
      connectionId,
      authUrl,
      state
    }
    
    return Response.json(response)
  } catch (error) {
    console.error('Failed to initiate connection:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
})