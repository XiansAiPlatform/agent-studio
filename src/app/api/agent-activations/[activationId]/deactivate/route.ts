import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * POST /api/agent-activations/{activationId}/deactivate
 * Deactivate an agent activation. Tenant is injected from session.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ activationId: string }> }
) {
  const handler = withTenantFromSession(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params

      if (!activationId) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'activationId is required' },
          { status: 400 }
        )
      }

      const xians = createXiansSDK((apiContext.session as any).accessToken)
      await xians.agents.deactivateActivation(apiContext.tenantContext.tenant.id, activationId)

      return NextResponse.json(
        { message: 'Activation deactivated successfully' },
        { status: 200 }
      )
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        {
          error: 'Failed to deactivate activation',
          message:
            error?.response?.error?.message ||
            error?.response?.error ||
            error?.response?.message ||
            error?.message ||
            'Failed to deactivate activation',
          details: error?.response?.details || error?.details,
        },
        { status: error.status || 500 }
      )
    }
  })
  return handler(request)
}
