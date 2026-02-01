import { NextRequest, NextResponse } from "next/server"
import { withTenant, withTenantPermission } from "@/lib/api/with-tenant"
import { createXiansSDK } from "@/lib/xians"
import { OIDC_PROVIDERS, getProviderById } from "@/config/oidc-providers"
import { 
  OIDCConnection, 
  CreateConnectionRequest, 
  ConnectionsListResponse,
  ConnectionResponse,
  ConnectionStatus
} from "@/app/(dashboard)/settings/connections/types"

// Mock data for development - In production, this would come from Xians backend
// Shared mock storage that other route files can access
const mockConnections: Record<string, OIDCConnection[]> = {}

// Export for other route files to use
if (typeof global !== 'undefined') {
  (global as any).mockConnections = mockConnections
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function getMockConnections(tenantId: string): OIDCConnection[] {
  if (!mockConnections[tenantId]) {
    // Initialize with some sample data for demo purposes
    mockConnections[tenantId] = [
      {
        id: 'conn_1',
        userId: 'user_1',
        tenantId,
        name: 'Company SharePoint',
        providerId: 'sharepoint',
        clientId: 'sample-client-id-123',
        status: 'connected' as ConnectionStatus,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        createdBy: 'user@example.com',
        hasValidToken: true,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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
        tokenExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2 days ago
        description: 'Engineering team Slack workspace',
        isActive: true,
        usageCount: 23,
        lastError: 'Token expired',
        lastErrorAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ]
  }
  return mockConnections[tenantId]
}

function saveMockConnections(tenantId: string, connections: OIDCConnection[]) {
  mockConnections[tenantId] = connections
}

// GET /api/tenants/{tenantId}/connections
export const GET = withTenant(async (request, { tenantContext, session }) => {
  try {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const status = url.searchParams.get('status')
    const providerId = url.searchParams.get('providerId')
    const onlyActive = url.searchParams.get('onlyActive') === 'true'

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const response = await xians.connections.listConnections(tenantContext.tenant.id, filters)
    
    // Mock implementation
    let connections = getMockConnections(tenantContext.tenant.id)

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      connections = connections.filter(conn => 
        conn.name.toLowerCase().includes(searchLower) ||
        conn.description?.toLowerCase().includes(searchLower) ||
        getProviderById(conn.providerId)?.displayName.toLowerCase().includes(searchLower)
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

    // Remove sensitive information from response
    const sanitizedConnections = connections.map(conn => ({
      ...conn,
      clientSecret: undefined, // Never expose client secrets
    }))

    const response: ConnectionsListResponse = {
      connections: sanitizedConnections,
      total: sanitizedConnections.length,
      hasMore: false // For simplicity, not implementing pagination in mock
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

// POST /api/tenants/{tenantId}/connections
export const POST = withTenantPermission('write', async (request, { tenantContext, session }) => {
  try {
    const data: CreateConnectionRequest = await request.json()
    
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

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const connection = await xians.connections.createConnection(tenantContext.tenant.id, data)
    
    // Mock implementation
    const now = new Date().toISOString()
    const newConnection: OIDCConnection = {
      id: `conn_${generateId()}`,
      tenantId: tenantContext.tenant.id,
      userId: (session as any).user.id,
      name: data.name,
      providerId: data.providerId,
      clientId: data.clientId,
      // clientSecret is stored securely in backend, not returned in API
      customScopes: data.customScopes,
      wellKnownUrl: data.wellKnownUrl,
      status: 'draft' as ConnectionStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: (session as any).user.email || (session as any).user.id,
      hasValidToken: false,
      description: data.description,
      isActive: true,
      usageCount: 0,
    }

    const connections = getMockConnections(tenantContext.tenant.id)
    connections.push(newConnection)
    saveMockConnections(tenantContext.tenant.id, connections)

    // Return connection without sensitive data
    const response: ConnectionResponse = {
      connection: {
        ...newConnection,
        clientSecret: undefined
      }
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