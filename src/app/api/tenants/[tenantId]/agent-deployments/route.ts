import { NextResponse } from 'next/server'
import { withTenant } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * GET /api/tenants/{tenantId}/agent-deployments
 * Fetch deployed agents for a tenant
 */
export const GET = withTenant(async (request, { tenantContext, session }) => {
  try {
    // Create SDK instance with user's auth token
    const xians = createXiansSDK(session.accessToken)
    
    // Fetch agent deployments (returns { agents: [...], pagination: {...} })
    const response = await xians.agents.listAgentDeployments(tenantContext.tenant.id)
    
    console.log('[Agent Deployments API] Response from Xians:', response)
    console.log('[Agent Deployments API] Agents count:', response.agents?.length)
    
    // Return the full response with agents and pagination
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching agent deployments:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch agent deployments',
        message: error.message 
      },
      { status: error.status || 500 }
    )
  }
})

/**
 * POST /api/tenants/{tenantId}/agent-deployments
 * Create a new agent deployment from a template
 */
export const POST = withTenant(async (request, { tenantContext, session }) => {
  try {
    const data = await request.json()
    
    // Create SDK instance with user's auth token
    const xians = createXiansSDK(session.accessToken)
    
    // Create agent deployment
    const deployment = await xians.agents.createAgentDeployment(
      tenantContext.tenant.id,
      data
    )
    
    return NextResponse.json(deployment, { status: 201 })
  } catch (error: any) {
    console.error('Error creating agent deployment:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create agent deployment',
        message: error.message 
      },
      { status: error.status || 500 }
    )
  }
})
