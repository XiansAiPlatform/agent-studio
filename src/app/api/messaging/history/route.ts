import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/messaging/history
 * Fetch message history. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const topic = searchParams.get('topic')
      const page = searchParams.get('page') || '1'
      const pageSize = searchParams.get('pageSize') || '50'
      const chatOnly = searchParams.get('chatOnly') || 'false'
      const sortOrder = searchParams.get('sortOrder') || 'asc'

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
        page,
        pageSize,
        chatOnly,
        sortOrder,
      })
      if (topic !== null) queryParams.append('topic', topic ?? '')

      const xiansClient = createXiansClient((session as any)?.accessToken)
      const history = await xiansClient.get(
        `/api/v1/admin/tenants/${tenantId}/messaging/history?${queryParams.toString()}`
      )

      return NextResponse.json(history)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
