import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'
import { requireSystemAdmin } from '@/lib/api/auth'

/**
 * POST /api/agents/store/{templateId}/deploy
 * Deploy an agent template to the current tenant.
 * Tenant is injected from session (httpOnly cookie). Requires system administrator access.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> }
) {
  const handler = withParticipantAdmin(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const authError = await requireSystemAdmin(apiContext.session)
      if (authError) return authError

      const { templateId } = await context.params
      const tenantId = apiContext.tenantContext.tenant.id

      console.log('[Deploy Template API] Deploying template:', templateId, 'to tenant:', tenantId)

      const xians = createXiansSDK((apiContext.session as any)?.accessToken)
      const result = await xians.agents.deployAgentTemplate(templateId, tenantId)

      console.log('[Deploy Template API] Deployment successful:', result)

      return NextResponse.json(result, { status: 200 })
    } catch (error: any) {
      return handleApiError(error, 'Deploy Template')
    }
  })
  return handler(request)
}
