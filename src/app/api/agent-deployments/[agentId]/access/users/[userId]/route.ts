import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError, validationError } from '@/lib/api/error-handler'
import type { AgentAccessLevel } from '@/lib/xians/types'
import { assertCanManageAgentAccess } from '../../_guard'

const LEVELS: AgentAccessLevel[] = ['Read', 'Write', 'Owner']

type Params = { params: Promise<{ agentId: string; userId: string }> }

/**
 * PATCH /api/agent-deployments/{agentId}/access/users/{userId}
 * Body: { level: 'Read' | 'Write' | 'Owner' } — change an existing user's level.
 */
export async function PATCH(request: NextRequest, context: Params) {
  const handler = withParticipantAdmin(async (req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentId, userId } = await context.params
      if (!agentId || !userId) {
        return validationError('Agent id and user id are required')
      }

      let body: { level?: unknown }
      try {
        body = await req.json()
      } catch {
        return validationError('Invalid JSON body')
      }
      const level = body.level as AgentAccessLevel
      if (!LEVELS.includes(level)) {
        return validationError(`level must be one of: ${LEVELS.join(', ')}`)
      }

      const tenantId = apiContext.tenantContext.tenant.id
      const xians = createXiansSDK((apiContext.session as { accessToken?: string })?.accessToken)

      const current = await xians.agents.getAgentAccess(tenantId, agentId)
      const denied = await assertCanManageAgentAccess(apiContext.session, tenantId, current)
      if (denied) return denied

      const updated = await xians.agents.updateAgentAccessUser(tenantId, agentId, userId, level)
      return NextResponse.json(updated)
    } catch (error) {
      return handleApiError(error, 'Update Agent Access User')
    }
  })
  return handler(request)
}

/**
 * DELETE /api/agent-deployments/{agentId}/access/users/{userId}
 * Remove a user from every access level for the agent.
 */
export async function DELETE(request: NextRequest, context: Params) {
  const handler = withParticipantAdmin(async (_req: NextRequest, apiContext: ApiContext) => {
    try {
      const { agentId, userId } = await context.params
      if (!agentId || !userId) {
        return validationError('Agent id and user id are required')
      }

      const tenantId = apiContext.tenantContext.tenant.id
      const xians = createXiansSDK((apiContext.session as { accessToken?: string })?.accessToken)

      const current = await xians.agents.getAgentAccess(tenantId, agentId)
      const denied = await assertCanManageAgentAccess(apiContext.session, tenantId, current)
      if (denied) return denied

      const updated = await xians.agents.removeAgentAccessUser(tenantId, agentId, userId)
      return NextResponse.json(updated)
    } catch (error) {
      return handleApiError(error, 'Remove Agent Access User')
    }
  })
  return handler(request)
}
