import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError, validationError } from '@/lib/api/error-handler'
import type { AgentAccessLevel } from '@/lib/xians/types'
import { assertCanManageAgentAccess } from './_guard'

const LEVELS: AgentAccessLevel[] = ['Read', 'Write', 'Owner']

/**
 * GET /api/agent-deployments/{agentId}/access
 * Return an agent's owner / write / read access lists.
 * `agentId` here is the agent's Mongo id (deployment.id), not its name.
 * Tenant is injected from the session cookie.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const handler = withParticipantAdmin(async (_req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentId } = await context.params
      if (!agentId) {
        return validationError('Agent id is required')
      }

      const tenantId = apiContext.tenantContext.tenant.id
      const xians = createXiansSDK((apiContext.session as { accessToken?: string })?.accessToken)
      const access = await xians.agents.getAgentAccess(tenantId, agentId)

      const denied = await assertCanManageAgentAccess(apiContext.session, tenantId, access)
      if (denied) return denied

      return NextResponse.json(access)
    } catch (error) {
      return handleApiError(error, 'Get Agent Access')
    }
  })
  return handler(request)
}

/**
 * POST /api/agent-deployments/{agentId}/access
 * Body: { userId: string, level: 'Read' | 'Write' | 'Owner' }
 * Add (or move) a user to the given access level.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const handler = withParticipantAdmin(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentId } = await context.params
      if (!agentId) {
        return validationError('Agent id is required')
      }

      let body: { userId?: unknown; level?: unknown }
      try {
        body = await req.json()
      } catch {
        return validationError('Invalid JSON body')
      }

      const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
      const level = body.level as AgentAccessLevel
      if (!userId) {
        return validationError('userId is required')
      }
      if (userId.includes('@')) {
        return validationError('userId must be a user id, not an email address')
      }
      if (!LEVELS.includes(level)) {
        return validationError(`level must be one of: ${LEVELS.join(', ')}`)
      }

      const tenantId = apiContext.tenantContext.tenant.id
      const xians = createXiansSDK((apiContext.session as { accessToken?: string })?.accessToken)

      const current = await xians.agents.getAgentAccess(tenantId, agentId)
      const denied = await assertCanManageAgentAccess(apiContext.session, tenantId, current)
      if (denied) return denied

      const updated = await xians.agents.addAgentAccessUser(tenantId, agentId, userId, level)
      return NextResponse.json(updated)
    } catch (error) {
      return handleApiError(error, 'Add Agent Access User')
    }
  })
  return handler(request)
}
