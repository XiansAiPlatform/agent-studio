import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * POST /api/agent-deployments/{agentId}/promote-to-template
 * Promote a running tenant-scoped agent into a new system-scoped template.
 * Tenant is injected from session (httpOnly cookie). The backend enforces that
 * only system administrators may complete the promotion.
 * Note: agentId in the URL is actually the agent name.
 */
export async function POST(
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
      console.log('[Promote Agent To Template API] Promoting agent:', agentId, 'from tenant:', tenantId)

      const xians = createXiansSDK((apiContext.session as any)?.accessToken)
      const template = await xians.agents.promoteAgentToTemplate(tenantId, agentId)

      console.log('[Promote Agent To Template API] Agent promoted successfully')

      return NextResponse.json(template, { status: 201 })
    } catch (error: any) {
      return handleApiError(error, 'Promote Agent To Template')
    }
  })
  return handler(request)
}
