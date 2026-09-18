import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { decodeAgentNameParam, isValidAgentName, normalizeAgentName, AGENT_NAME_VALIDATION_MESSAGE } from '@/lib/xians/agent-name'

/**
 * GET /api/agent-activations
 * List agent activations. Tenant is injected from session (httpOnly cookie).
 * Kept at tenant-member level: participants need the list of available agents to
 * start conversations. Mutating activations is gated to Agent Settings access below.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = searchParams.get('page')
      const pageSize = searchParams.get('pageSize')
      const agentName = searchParams.get('agentName')
      const status = searchParams.get('status')

      const xians = createXiansSDK((session as any).accessToken)
      const response = await xians.agents.listActivations(tenantContext.tenant.id, {
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
        agentName: agentName ? decodeAgentNameParam(agentName) : undefined,
        status: status || undefined,
      })

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error, 'Activations GET', {
        fallbackMessage: 'Failed to fetch activations',
      })
    }
  }
)

/**
 * POST /api/agent-activations
 * Create a new agent activation. Tenant is injected from session.
 * Restricted to users with Agent Settings access (excludes plain participants).
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const data = await request.json()

      if (!data.name || !data.agentName) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'name and agentName are required fields' },
          { status: 400 }
        )
      }

      const name = normalizeAgentName(String(data.name))
      const agentName = decodeAgentNameParam(String(data.agentName))
      if (!isValidAgentName(name) || !isValidAgentName(agentName)) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: AGENT_NAME_VALIDATION_MESSAGE,
          },
          { status: 400 }
        )
      }

      const denied = await assertCanEditAgent(session, tenantContext.tenant.id, agentName)
      if (denied) return denied

      const participantId = (session as any)?.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      const xians = createXiansSDK((session as any).accessToken)
      const activation = await xians.agents.createActivation(tenantContext.tenant.id, {
        ...data,
        name,
        agentName,
        participantId,
      })

      return NextResponse.json(activation, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'Activations POST', {
        fallbackMessage: 'Failed to create activation',
      })
    }
  }
)
