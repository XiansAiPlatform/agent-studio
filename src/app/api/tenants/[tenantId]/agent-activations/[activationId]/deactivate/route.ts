import { NextRequest, NextResponse } from 'next/server'
import { withTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * POST /api/tenants/{tenantId}/agent-activations/{activationId}/deactivate
 * Deactivate an agent activation (instance)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; activationId: string }> }
) {
  return withTenant(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params

      console.log('[Activations API] POST deactivate request received:', {
        tenantId: apiContext.tenantContext.tenant.id,
        activationId,
        userId: (apiContext.session as any)?.user?.id
      })

      if (!activationId) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'activationId is required',
          },
          { status: 400 }
        )
      }

      // Create SDK instance with user's auth token
      const xians = createXiansSDK((apiContext.session as any).accessToken)

      console.log('[Activations API] Calling Xians SDK to deactivate activation...')

      // Deactivate the activation
      await xians.agents.deactivateActivation(apiContext.tenantContext.tenant.id, activationId)

      console.log('[Activations API] Successfully deactivated activation:', activationId)

      return NextResponse.json(
        { message: 'Activation deactivated successfully' },
        { status: 200 }
      )
    } catch (error: any) {
      console.error('[Activations API] Error deactivating activation:', error)

      // Extract error message from Xians API response
      const errorMessage =
        error?.response?.error?.message ||
        error?.response?.error ||
        error?.response?.message ||
        error?.message ||
        'Failed to deactivate activation'

      // Extract error details
      const errorDetails = error?.response?.details || error?.details || undefined

      return NextResponse.json(
        {
          error: 'Failed to deactivate activation',
          message: errorMessage,
          details: errorDetails,
        },
        { status: error.status || 500 }
      )
    }
  })(request)
}
