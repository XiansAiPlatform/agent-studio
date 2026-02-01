import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/api/with-tenant"
import { getProviderById } from "@/config/oidc-providers"
import { 
  ConnectionTestResult,
  ConnectionTestResponse 
} from "@/app/(dashboard)/settings/connections/types"

// Mock data storage - use shared storage
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

async function simulateConnectionTest(connection: any): Promise<ConnectionTestResult> {
  const startTime = Date.now()
  
  try {
    // Simulate testing different aspects of the connection
    const provider = getProviderById(connection.providerId)
    
    if (!provider) {
      return {
        success: false,
        error: 'Unknown provider',
        testedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    }

    // Simulate various test steps
    const details = {
      wellKnownEndpoint: true,
      clientCredentials: true,
      tokenExchange: false,
      apiAccess: false
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    // Mock different scenarios based on connection status
    let success = false
    let error: string | undefined

    switch (connection.status) {
      case 'connected':
        // Simulate successful test for connected connections
        details.tokenExchange = true
        details.apiAccess = true
        success = true
        break
        
      case 'expired':
        // Simulate token expired scenario
        details.tokenExchange = false
        success = false
        error = 'Access token has expired. Please reauthorize the connection.'
        break
        
      case 'error':
        // Simulate error scenario
        details.clientCredentials = false
        success = false
        error = 'Invalid client credentials. Please check your client ID and secret.'
        break
        
      case 'draft':
        // Simulate draft scenario - not yet authorized
        success = false
        error = 'Connection not authorized yet. Please complete the OAuth flow.'
        break
        
      default:
        // Random success/failure for other statuses
        const randomSuccess = Math.random() > 0.3
        if (randomSuccess) {
          details.tokenExchange = true
          details.apiAccess = true
          success = true
        } else {
          success = false
          error = 'Connection test failed. Please check your configuration.'
        }
    }

    return {
      success,
      error,
      details,
      responseTime: Date.now() - startTime,
      testedAt: new Date().toISOString()
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during connection test',
      responseTime: Date.now() - startTime,
      testedAt: new Date().toISOString()
    }
  }
}

// POST /api/tenants/{tenantId}/connections/{connectionId}/test
export const POST = withTenant(async (request, { tenantContext }) => {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const connectionId = pathParts[pathParts.length - 2] // test is the last part
    
    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // In production, this would call the Xians backend
    // const xians = createXiansSDK((session as any).accessToken)
    // const testResult = await xians.connections.testConnection(tenantContext.tenant.id, connectionId)
    
    // Mock implementation
    const connection = findConnectionById(tenantContext.tenant.id, connectionId)
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const testResult = await simulateConnectionTest(connection)

    // Update connection with test results (in mock storage)
    if (!testResult.success && testResult.error) {
      connection.lastError = testResult.error
      connection.lastErrorAt = testResult.testedAt
      if (testResult.error.includes('expired')) {
        connection.status = 'expired'
      } else if (testResult.error.includes('Invalid client')) {
        connection.status = 'error'
      }
    } else if (testResult.success) {
      connection.lastError = undefined
      connection.lastErrorAt = undefined
      if (connection.status !== 'connected') {
        // Don't automatically change status to connected unless we have valid tokens
        // This would be handled by the OAuth flow
      }
    }

    const response: ConnectionTestResponse = {
      result: testResult
    }
    
    return Response.json(response)
  } catch (error) {
    console.error('Failed to test connection:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
})