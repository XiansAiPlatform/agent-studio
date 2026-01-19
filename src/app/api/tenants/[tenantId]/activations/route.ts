import { NextRequest, NextResponse } from 'next/server'
import { withTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * GET /api/tenants/{tenantId}/agentActivations
 * List agent activations for a tenant
 */
export const GET = withTenant(async (request: NextRequest, { tenantContext, session }: ApiContext) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const pageSize = searchParams.get('pageSize')
    const agentName = searchParams.get('agentName')
    const status = searchParams.get('status')

    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any).accessToken)
    
    // Fetch agent activations
    const response = await xians.agents.listActivations(tenantContext.tenant.id, {
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      agentName: agentName || undefined,
      status: status || undefined,
    })
    
    console.log('[Activations API] Response from Xians:', response)
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching activations:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch activations',
        message: error.message 
      },
      { status: error.status || 500 }
    )
  }
})

/**
 * POST /api/tenants/{tenantId}/agentActivations
 * Create a new agent activation
 */
export const POST = withTenant(async (request: NextRequest, { tenantContext, session }: ApiContext) => {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.agentName) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          message: 'name and agentName are required fields'
        },
        { status: 400 }
      )
    }
    
    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any).accessToken)
    
    // Create agent activation
    const activation = await xians.agents.createActivation(
      tenantContext.tenant.id,
      data
    )
    
    console.log('[Activations API] Created activation:', activation)
    
    return NextResponse.json(activation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating activation:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create activation',
        message: error.message 
      },
      { status: error.status || 500 }
    )
  }
})
