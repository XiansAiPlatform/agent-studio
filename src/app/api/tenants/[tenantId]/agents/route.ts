import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { withTenant, withTenantPermission } from "@/lib/api/with-tenant"
import { createXiansSDK } from "@/lib/xians"

// GET /api/tenants/{tenantId}/agents
export const GET = withTenant(async (request, { tenantContext, session }) => {
  try {

    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any).accessToken)
    
    // Call Xians server API
    const response = await xians.agents.listAgents(tenantContext.tenant.id)
    
    return Response.json({
      tenant: tenantContext.tenant,
      userRole: tenantContext.userRole,
      agents: response.data,
      pagination: response.pagination
    })
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
})

// POST /api/tenants/{tenantId}/agents
export const POST = withTenantPermission('write', async (request, { tenantContext, session }) => {
  try {
    const data = await request.json()
    
    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any).accessToken)
    
    // Call Xians server API to create agent
    const agent = await xians.agents.createAgent(tenantContext.tenant.id, data)
    
    return Response.json(agent, { status: 201 })
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
})
