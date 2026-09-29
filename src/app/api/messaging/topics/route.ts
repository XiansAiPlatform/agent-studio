import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { resolveMessagingParticipantId } from '@/lib/api/messaging-view-as'

/**
 * GET /api/messaging/topics
 * Fetch messaging topics. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const workflowType = searchParams.get('workflowType')
      const page = searchParams.get('page') || '1'
      const pageSize = searchParams.get('pageSize') || '20'

      const accessToken = (session as { accessToken?: string }).accessToken
      const resolved = await resolveMessagingParticipantId({
        session,
        tenantId,
        searchParams,
        accessToken,
      })
      if (resolved instanceof NextResponse) {
        return resolved
      }
      const { participantId } = resolved

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
      })
      if (workflowType) queryParams.set('workflowType', workflowType)

      const xiansClient = createXiansClient(accessToken)
      const topics = await xiansClient.get(
        `/api/v1/admin/tenants/${tenantId}/messaging/topics?${queryParams.toString()}`
      )

      return NextResponse.json(topics)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
