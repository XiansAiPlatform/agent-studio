import { NextRequest, NextResponse } from "next/server"
import { withTenantFromSession, ApiContext } from "@/lib/api/with-tenant"
import {
  OIDCConnection,
  UpdateConnectionRequest,
  ConnectionResponse,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

function getMockStorage(): Record<string, OIDCConnection[]> {
  if (typeof global !== 'undefined' && (global as any).mockConnections) {
    return (global as any).mockConnections
  }
  return {}
}

function getMockConnections(tenantId: string): OIDCConnection[] {
  const storage = getMockStorage()
  return storage[tenantId] || []
}

function saveMockConnections(tenantId: string, connections: OIDCConnection[]) {
  const storage = getMockStorage()
  storage[tenantId] = connections
}

function findConnectionById(tenantId: string, connectionId: string): OIDCConnection | undefined {
  const connections = getMockConnections(tenantId)
  return connections.find(conn => conn.id === connectionId)
}

// GET /api/connections/{connectionId}
export const GET = withTenantFromSession(async (request, apiContext: ApiContext) => {
  try {
    const tenantId = apiContext.tenantContext.tenant.id
    const connectionId = request.nextUrl.pathname.split('/').pop()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    const connection = findConnectionById(tenantId, connectionId)

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const response: ConnectionResponse = {
      connection: {
        ...connection,
        clientSecret: undefined
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error('Failed to fetch connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
})

// PUT /api/connections/{connectionId}
export const PUT = withTenantFromSession(async (request, apiContext: ApiContext) => {
  try {
    if (!apiContext.tenantContext.permissions.includes('write')) {
      return NextResponse.json(
        { error: 'Permission denied: write required' },
        { status: 403 }
      )
    }

    const tenantId = apiContext.tenantContext.tenant.id
    const connectionId = request.nextUrl.pathname.split('/').pop()
    const data: UpdateConnectionRequest = await request.json()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    const connections = getMockConnections(tenantId)
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId)

    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const existingConnection = connections[connectionIndex]

    if (data.providerId && data.providerId !== existingConnection.providerId) {
      if (!data.providerId.trim()) {
        return NextResponse.json(
          { error: 'Invalid provider ID' },
          { status: 400 }
        )
      }
    }

    const updatedConnection: OIDCConnection = {
      ...existingConnection,
      ...data,
      updatedAt: new Date().toISOString(),
      ...(data.clientId && data.clientId !== existingConnection.clientId ? {
        hasValidToken: false,
        status: 'draft' as ConnectionStatus,
        lastError: 'Configuration changed - reauthorization required',
        lastErrorAt: new Date().toISOString()
      } : {})
    }

    connections[connectionIndex] = updatedConnection
    saveMockConnections(tenantId, connections)

    const response: ConnectionResponse = {
      connection: {
        ...updatedConnection,
        clientSecret: undefined
      }
    }

    return Response.json(response)
  } catch (error) {
    console.error('Failed to update connection:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
})

// DELETE /api/connections/{connectionId}
export const DELETE = withTenantFromSession(async (request, apiContext: ApiContext) => {
  try {
    if (!apiContext.tenantContext.permissions.includes('write')) {
      return NextResponse.json(
        { error: 'Permission denied: write required' },
        { status: 403 }
      )
    }

    const tenantId = apiContext.tenantContext.tenant.id
    const connectionId = request.nextUrl.pathname.split('/').pop()

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    const connections = getMockConnections(tenantId)
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId)

    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    connections.splice(connectionIndex, 1)
    saveMockConnections(tenantId, connections)

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
})
