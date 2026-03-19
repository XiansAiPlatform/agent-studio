import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * DELETE /api/agent-deployments/{agentId}
 * Delete a deployed agent. Tenant is injected from session (httpOnly cookie).
 * Note: agentId in the URL is actually the agent name.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const handler = withParticipantAdmin(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentId } = await context.params

      if (!agentId) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'Agent name is required' },
          { status: 400 }
        )
      }

      const tenantId = apiContext.tenantContext.tenant.id
      console.log('[Delete Agent Deployment API] Deleting agent:', agentId, 'from tenant:', tenantId)

      const xians = createXiansSDK((apiContext.session as any)?.accessToken)
      await xians.agents.deleteAgentDeployment(tenantId, agentId)

      console.log('[Delete Agent Deployment API] Agent deleted successfully')

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (error: any) {
      return handleApiError(error, 'Delete Agent Deployment')
    }
  })
  return handler(request)
}
