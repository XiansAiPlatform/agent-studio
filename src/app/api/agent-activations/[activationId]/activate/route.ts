import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * POST /api/agent-activations/{activationId}/activate
 * Activate an agent instance with workflow configuration. Tenant is injected from session.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ activationId: string }> }
) {
  const handler = withTenantFromSession(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params
      const body = await req.json()
      const { workflowConfiguration } = body

      if (!activationId) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'activationId is required' },
          { status: 400 }
        )
      }

      const tenantId = apiContext.tenantContext.tenant.id
      const client = createXiansClient((apiContext.session as any)?.accessToken)
      const result = await client.post<any>(
        `/api/v1/admin/tenants/${tenantId}/agentActivations/${activationId}/activate`,
        { workflowConfiguration }
      )

      return NextResponse.json({
        success: true,
        message: 'Agent activated successfully',
        data: result,
      })
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        {
          error: error.message || 'Failed to activate agent',
          details: error.response || undefined,
        },
        { status: error.status || 500 }
      )
    }
  })
  return handler(request)
}
