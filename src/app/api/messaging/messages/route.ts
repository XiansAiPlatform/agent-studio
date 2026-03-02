import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * DELETE /api/messaging/messages
 * Delete messages. Tenant is injected from session (httpOnly cookie).
 */
export const DELETE = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const topic = searchParams.get('topic')

      const participantId = session.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      if (!agentName || !activationName) {
        return NextResponse.json(
          { error: 'agentName and activationName are required' },
          { status: 400 }
        )
      }

      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        participantId,
      })
      if (topic !== null) queryParams.append('topic', topic ?? '')

      const xiansClient = createXiansClient()
      await xiansClient.delete(
        `/api/v1/admin/tenants/${tenantId}/messaging/messages?${queryParams.toString()}`
      )

      return NextResponse.json({ success: true })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
