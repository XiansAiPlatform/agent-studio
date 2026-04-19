import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { withParticipantAdmin, ApiContext } from "@/lib/api/with-tenant"
import {
  OIDCConnection,
  CreateConnectionRequest,
  ConnectionsListResponse,
  ConnectionResponse,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

// Mock data for development - In production, this would come from Xians backend
// Shared mock storage (same as tenant routes) - ensure global exists, don't overwrite
if (typeof global !== 'undefined' && !(global as any).mockConnections) {
  (global as any).mockConnections = {}
}

function generateId(): string {
  return randomBytes(9).toString('base64url')
}

function getMockStorage(): Record<string, OIDCConnection[]> {
  if (typeof global !== 'undefined' && (global as any).mockConnections) {
    return (global as any).mockConnections
  }
  return {}
}

function getMockConnections(tenantId: string): OIDCConnection[] {
  const storage = getMockStorage()
  if (!storage[tenantId]) {
    storage[tenantId] = [
      {
        id: 'conn_1',
        userId: 'user_1',
        tenantId,
        name: 'Company SharePoint',
        providerId: 'sharepoint',
        clientId: 'sample-client-id-123',
        status: 'connected' as ConnectionStatus,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdBy: 'user@example.com',
        hasValidToken: true,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastTokenRefresh: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Main company SharePoint for document access',
        isActive: true,
        usageCount: 45,
      },
      {
        id: 'conn_2',
        userId: 'user_2',
        tenantId,
        name: 'Team Slack Workspace',
        providerId: 'slack',
        clientId: 'slack-client-456',
        status: 'expired' as ConnectionStatus,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'admin@example.com',
        hasValidToken: false,
        tokenExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Engineering team Slack workspace',
        isActive: true,
        usageCount: 23,
        lastError: 'Token expired',
        lastErrorAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]
  }
  return storage[tenantId]
}

function saveMockConnections(tenantId: string, connections: OIDCConnection[]) {
  const storage = getMockStorage()
  storage[tenantId] = connections
}

// GET /api/connections
export const GET = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const providerId = url.searchParams.get('providerId')
    const onlyActive = url.searchParams.get('onlyActive') === 'true'

    let connections = getMockConnections(tenantId)

    if (search) {
      const searchLower = search.toLowerCase()
      connections = connections.filter(conn =>
        conn.name.toLowerCase().includes(searchLower) ||
        conn.description?.toLowerCase().includes(searchLower) ||
        conn.providerId.toLowerCase().includes(searchLower)
      )
    }

    if (status) {
      connections = connections.filter(conn => conn.status === status)
    }

    if (providerId) {
      connections = connections.filter(conn => conn.providerId === providerId)
    }

    if (onlyActive) {
      connections = connections.filter(conn => conn.isActive)
    }

    const sanitizedConnections = connections.map(conn => ({
      ...conn,
      clientSecret: undefined,
    }))

    const response: ConnectionsListResponse = {
      connections: sanitizedConnections,
      total: sanitizedConnections.length,
      hasMore: false,
    }

    return Response.json(response)
  } catch (error) {
    console.error('Failed to fetch connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
})

// POST /api/connections
export const POST = withParticipantAdmin(async (request, apiContext: ApiContext) => {
  try {
    if (!apiContext.tenantContext.permissions.includes('write')) {
      return NextResponse.json(
        { error: 'Permission denied: write required' },
        { status: 403 }
      )
    }

    const tenantId = apiContext.tenantContext.tenant.id
    const data: CreateConnectionRequest = await request.json()

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
    const newConnection: OIDCConnection = {
      id: `conn_${generateId()}`,
      tenantId,
      userId: (apiContext.session as any).user.id,
      name: data.name,
      providerId: data.providerId,
      clientId: data.clientId,
      customScopes: data.customScopes,
      wellKnownUrl: data.wellKnownUrl,
      status: 'draft' as ConnectionStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: (apiContext.session as any).user.email || (apiContext.session as any).user.id,
      hasValidToken: false,
      description: data.description,
      isActive: true,
      usageCount: 0,
    }

    const connections = getMockConnections(tenantId)
    connections.push(newConnection)
    saveMockConnections(tenantId, connections)

    const response: ConnectionResponse = {
      connection: {
        ...newConnection,
        clientSecret: undefined,
      },
    }

    return Response.json(response, { status: 201 })
  } catch (error) {
    console.error('Failed to create connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
})
