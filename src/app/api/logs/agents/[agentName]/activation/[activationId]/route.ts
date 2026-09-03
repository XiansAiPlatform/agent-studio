import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * DELETE /api/logs/agents/{agentName}/activation/{activationId}
 * Deletes all logs for an agent activation.
 * Tenant is injected from session (httpOnly cookie).
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ agentName: string; activationId: string }> }
) {
  const handler = withParticipantAdmin(
    async (req: NextRequest, { tenantContext }: ApiContext) => {
      try {
        const { agentName, activationId } = await context.params
        if (!agentName || !activationId) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              message: 'agentName and activationId are required',
            },
            { status: 400 }
          )
        }

        const tenantId = tenantContext.tenant.id
        const backendPath = `/api/v1/admin/tenants/${tenantId}/logs/agents/${encodeURIComponent(agentName)}/activation/${encodeURIComponent(activationId)}`

        const client = createXiansClient()
        await client.delete<any>(backendPath)

        return NextResponse.json({ success: true })
      } catch (error) {
        return handleApiError(error, 'logs DELETE by activation', {
          fallbackMessage: 'Failed to delete logs',
        })
      }
    }
  )
  return handler(request)
}
