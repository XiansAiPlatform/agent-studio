import { NextRequest, NextResponse } from "next/server"
import { withTenant, withTenantPermission } from "@/lib/api/with-tenant"
import { createXiansSDK } from "@/lib/xians"
import { getProviderById } from "@/config/oidc-providers"
import { 
  OIDCConnection, 
  UpdateConnectionRequest, 
  ConnectionResponse, 
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

// Mock data storage - In production this would be in Xians backend
// Use shared mock storage
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

// GET /api/tenants/{tenantId}/connections/{connectionId}
export const GET = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 1]
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const connection = await xians.connections.getConnection(tenantContext.tenant.id, connectionId)
    
    // Mock implementation
    const connection = findConnectionById(tenantContext.tenant.id, connectionId)
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Remove sensitive information
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

// PUT /api/tenants/{tenantId}/connections/{connectionId}
export const PUT = withTenantPermission('write', async (request, { tenantContext, session }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 1]
    const data: UpdateConnectionRequest = await request.json()
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const connection = await xians.connections.updateConnection(tenantContext.tenant.id, connectionId, data)
    
    // Mock implementation
    const connections = getMockConnections(tenantContext.tenant.id)
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId)
    
    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const existingConnection = connections[connectionIndex]
    
    // Validate provider ID if it's being updated
    if (data.providerId && data.providerId !== existingConnection.providerId) {
      const provider = getProviderById(data.providerId)
      if (!provider) {
        return NextResponse.json(
          { error: 'Invalid provider ID' },
          { status: 400 }
        )
      }
    }

    // Update connection
    const updatedConnection: OIDCConnection = {
      ...existingConnection,
      ...data,
      updatedAt: new Date().toISOString(),
      // Reset token status if critical fields changed
      ...(data.clientId && data.clientId !== existingConnection.clientId ? {
        hasValidToken: false,
        status: 'draft' as ConnectionStatus,
        lastError: 'Configuration changed - reauthorization required',
        lastErrorAt: new Date().toISOString()
      } : {})
    }

    connections[connectionIndex] = updatedConnection
    saveMockConnections(tenantContext.tenant.id, connections)

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

// DELETE /api/tenants/{tenantId}/connections/{connectionId}
export const DELETE = withTenantPermission('write', async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 1]
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // await xians.connections.deleteConnection(tenantContext.tenant.id, connectionId)
    
    // Mock implementation
    const connections = getMockConnections(tenantContext.tenant.id)
    const connectionIndex = connections.findIndex(conn => conn.id === connectionId)
    
    if (connectionIndex === -1) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    connections.splice(connectionIndex, 1)
    saveMockConnections(tenantContext.tenant.id, connections)
    
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
})