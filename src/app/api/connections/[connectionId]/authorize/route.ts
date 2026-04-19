import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { withParticipantAdmin, ApiContext } from "@/lib/api/with-tenant"
import {
  AuthorizeConnectionRequest,
  AuthorizeConnectionResponse
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

function generateState(): string {
  return randomBytes(32).toString('hex')
}

// POST /api/connections/{connectionId}/authorize
export const POST = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const pathParts = request.nextUrl.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 2]

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    await request.json() // AuthorizeConnectionRequest - may have returnUrl etc.

    const connection = findConnectionById(tenantId, connectionId)

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    if (!connection.providerId) {
      return NextResponse.json(
        { error: 'Invalid provider configuration' },
        { status: 400 }
      )
    }

    const state = generateState()
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connections/${connectionId}/callback`
    const scopes = connection.customScopes || []

    let authUrl: string

    switch (connection.providerId) {
      case 'sharepoint':
      case 'outlook365':
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}&` +
          `prompt=consent`
        break

      case 'google-workspace':
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
        authUrl = `https://slack.com/oauth/v2/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(','))}&` +
          `state=${encodeURIComponent(state)}`
        break

      case 'github':
        authUrl = `https://github.com/login/oauth/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes.join(' '))}&` +
          `state=${encodeURIComponent(state)}`
        break

      case 'notion':
        authUrl = `https://api.notion.com/v1/oauth/authorize?` +
          `client_id=${encodeURIComponent(connection.clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `state=${encodeURIComponent(state)}`
        break

      default:
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
