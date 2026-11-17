import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { evalsErrorResponse, prepareEvalRequest } from '@/lib/xians/evals'

/**
 * GET /api/evals/webhook-targets?agentName=...&activationName=...
 * The agent's workflows, update methods and webhook names, for the webhook eval form.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const targets = await ctx.client.get<unknown[]>(`${ctx.basePath}/webhook-targets`)
      return NextResponse.json(Array.isArray(targets) ? targets : [])
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to load webhook targets')
    }
  }
)
