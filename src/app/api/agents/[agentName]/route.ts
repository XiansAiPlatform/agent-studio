import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { XiansAgentsApi } from '@/lib/xians/agents'

/**
 * GET /api/agents/{agentName}
 * Get agent deployment details. Tenant is injected from session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentName: string }> }
) {
  const handler = withTenantFromSession(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentName } = await context.params

      if (!agentName) {
        return NextResponse.json(
          { error: 'Agent name is required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((apiContext.session as any)?.accessToken)
      const agentsApi = new XiansAgentsApi(client)
      const agentDeployment = await agentsApi.getAgentDeployment(
        apiContext.tenantContext.tenant.id,
        agentName
      )

      return NextResponse.json(agentDeployment)
    } catch (error: any) {
      console.error('[API] Error fetching agent deployment:', error)
      return NextResponse.json(
        {
          error: error.message || 'Failed to fetch agent deployment',
          details: error.response || undefined,
        },
        { status: error.status || 500 }
      )
    }
  })
  return handler(request)
}
