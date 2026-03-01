import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * PUT /api/agent-activations/{activationId}
 * Update an agent activation. Tenant is injected from session.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ activationId: string }> }
) {
  const handler = withTenantFromSession(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params
      const body = await req.json()

      if (!activationId) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'activationId is required' },
          { status: 400 }
        )
      }

      const { participantId: _, ...safeBody } = body
      const xians = createXiansSDK((apiContext.session as any).accessToken)
      const result = await xians.agents.updateActivation(
        apiContext.tenantContext.tenant.id,
        activationId,
        safeBody
      )

      return NextResponse.json(result, { status: 200 })
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        {
          error: 'Failed to update activation',
          message:
            error?.response?.error?.message ||
            error?.response?.error ||
            error?.response?.message ||
            error?.message ||
            'Failed to update activation',
          details: error?.response?.details || error?.details,
        },
        { status: error.status || 500 }
      )
    }
  })
  return handler(request)
}

/**
 * DELETE /api/agent-activations/{activationId}
 * Delete an agent activation. Tenant is injected from session.
 */
export async function DELETE(
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
      await xians.agents.deleteActivation(apiContext.tenantContext.tenant.id, activationId)

      return NextResponse.json(
        { message: 'Activation deleted successfully' },
        { status: 200 }
      )
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        {
          error: 'Failed to delete activation',
          message:
            error?.response?.error?.message ||
            error?.response?.error ||
            error?.response?.message ||
            error?.message ||
            'Failed to delete activation',
          details: error?.response?.details || error?.details,
        },
        { status: error.status || 500 }
      )
    }
  })
  return handler(request)
}
