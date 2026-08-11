import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * DELETE /api/schedules/agents/{agentName}/activation/{activationId}
 * Deletes all Temporal schedules for an agent activation.
 * Tenant is injected from session (httpOnly cookie).
 *
 * Note: the backend route for schedules is nested under
 * /tenants/{tenantId}/agents/{agentName}/schedules/activation/{activationId} (agent-scoped
 * route group), unlike the other categories which are /{resource}/agents/{agentName}/activation/{id}.
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
        const backendPath = `/api/v1/admin/tenants/${tenantId}/agents/${encodeURIComponent(agentName)}/schedules/activation/${encodeURIComponent(activationId)}`

        const client = createXiansClient()
        await client.delete<any>(backendPath)

        return NextResponse.json({ success: true })
      } catch (error) {
        return handleApiError(error, 'schedules DELETE by activation', {
          fallbackMessage: 'Failed to delete schedules',
        })
      }
    }
  )
  return handler(request)
}
