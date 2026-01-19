import { NextRequest, NextResponse } from 'next/server'
import { withTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * DELETE /api/tenants/{tenantId}/agentActivations/{activationId}
 * Delete an agent activation (instance)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; activationId: string }> }
) {
  return withTenant(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params

      console.log('[Activations API] DELETE request received:', {
        tenantId: apiContext.tenantContext.tenant.id,
        activationId,
        userId: apiContext.session.user.id
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

      console.log('[Activations API] Calling Xians SDK to delete activation...')

      // Delete the activation
      await xians.agents.deleteActivation(apiContext.tenantContext.tenant.id, activationId)

      console.log('[Activations API] Successfully deleted activation:', activationId)

      return NextResponse.json(
        { message: 'Activation deleted successfully' },
        { status: 200 }
      )
    } catch (error: any) {
      console.error('[Activations API] Error deleting activation:', error)

      // Extract error message from Xians API response
      const errorMessage =
        error?.error?.message ||
        error?.error ||
        error?.message ||
        'Failed to delete activation'

      return NextResponse.json(
        {
          error: 'Failed to delete activation',
          message: errorMessage,
          details: error?.details,
        },
        { status: error.status || 500 }
      )
    }
  })(request, {} as ApiContext)
}
