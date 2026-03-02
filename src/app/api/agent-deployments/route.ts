import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * GET /api/agent-deployments
 * Fetch deployed agents for the current tenant.
 * Tenant is injected from session (httpOnly cookie), never from frontend.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const xians = createXiansSDK((session as any)?.accessToken)
      const response = await xians.agents.listAgentDeployments(tenantContext.tenant.id)

      console.log('[Agent Deployments API] Agents count:', response.agents?.length)

      return NextResponse.json(response)
    } catch (error: any) {
      console.error('Error fetching agent deployments:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch agent deployments',
          message: error.message,
        },
        { status: error.status || 500 }
      )
    }
  }
)
