import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { evalsErrorResponse, prepareEvalRequest } from '@/lib/xians/evals'

/**
 * GET /api/evals/summary?agentName=...&activationName=...
 * Activation health derived from its evals' latest results:
 * healthy / degraded / unhealthy / unknown, with per-eval status.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const summary = await ctx.client.get<unknown>(`${ctx.basePath}/summary`)
      return NextResponse.json(summary)
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to load eval summary')
    }
  }
)
