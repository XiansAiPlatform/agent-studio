import { NextRequest, NextResponse } from 'next/server'
import { withTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * PUT /api/tenants/{tenantId}/agent-activations/{activationId}
 * Update an agent activation (instance)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; activationId: string }> }
) {
  return withTenant(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { activationId } = await context.params
      const body = await req.json()

      console.log('[Activations API] PUT request received:', {
        tenantId: apiContext.tenantContext.tenant.id,
        activationId,
        userId: (apiContext.session as any).user?.id,
        body
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

      console.log('[Activations API] Calling Xians SDK to update activation...')

      // Update the activation
      const result = await xians.agents.updateActivation(
        apiContext.tenantContext.tenant.id,
        activationId,
        body
      )

      console.log('[Activations API] Successfully updated activation:', activationId)

      return NextResponse.json(result, { status: 200 })
    } catch (error: any) {
      console.error('[Activations API] Error updating activation:', error)

      // Extract error message from Xians API response
      const errorMessage =
        error?.response?.error?.message ||
        error?.response?.error ||
        error?.response?.message ||
        error?.message ||
        'Failed to update activation'

      // Extract error details
      const errorDetails = error?.response?.details || error?.details || undefined

      return NextResponse.json(
        {
          error: 'Failed to update activation',
          message: errorMessage,
          details: errorDetails,
        },
        { status: error.status || 500 }
      )
    }
  })(request)
}

/**
 * DELETE /api/tenants/{tenantId}/agent-activations/{activationId}
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
        userId: (apiContext.session as any).user?.id
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
        error?.response?.error?.message ||
        error?.response?.error ||
        error?.response?.message ||
        error?.message ||
        'Failed to delete activation'

      // Extract error details
      const errorDetails = error?.response?.details || error?.details || undefined

      return NextResponse.json(
        {
          error: 'Failed to delete activation',
          message: errorMessage,
          details: errorDetails,
        },
        { status: error.status || 500 }
      )
    }
  })(request)
}
