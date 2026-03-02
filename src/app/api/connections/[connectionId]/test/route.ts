import { NextRequest, NextResponse } from "next/server"
import { withTenantFromSession, ApiContext } from "@/lib/api/with-tenant"
import {
  ConnectionTestResult,
  ConnectionTestResponse
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

async function simulateConnectionTest(connection: any): Promise<ConnectionTestResult> {
  const startTime = Date.now()

  try {
    if (!connection.providerId) {
      return {
        success: false,
        error: 'Unknown provider',
        testedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }
    }

    const details = {
      wellKnownEndpoint: true,
      clientCredentials: true,
      tokenExchange: false,
      apiAccess: false
    }

    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    let success = false
    let error: string | undefined

    switch (connection.status) {
      case 'connected':
        details.tokenExchange = true
        details.apiAccess = true
        success = true
        break

      case 'expired':
        details.tokenExchange = false
        success = false
        error = 'Access token has expired. Please reauthorize the connection.'
        break

      case 'error':
        details.clientCredentials = false
        success = false
        error = 'Invalid client credentials. Please check your client ID and secret.'
        break

      case 'draft':
        success = false
        error = 'Connection not authorized yet. Please complete the OAuth flow.'
        break

      default:
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

// POST /api/connections/{connectionId}/test
export const POST = withTenantFromSession(async (request, apiContext: ApiContext) => {
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

    const connection = findConnectionById(tenantId, connectionId)

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    const testResult = await simulateConnectionTest(connection)

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
