import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { evalsErrorResponse, prepareEvalRequest } from '@/lib/xians/evals'

/**
 * GET /api/evals?agentName=...&activationName=...
 * Lists the activation's evals (backend: health checks) with their latest status,
 * plus whether the activation is active (inactive activations pause their evals).
 * Tenant comes from the session cookie; restricted to TenantAdmin / system admin.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const checks = await ctx.client.get<unknown[]>(ctx.basePath)
      return NextResponse.json({
        activation: { name: ctx.activation.name, agentName: ctx.activation.agentName, isActive: ctx.activation.isActive },
        checks: Array.isArray(checks) ? checks : [],
      })
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to load evals')
    }
  }
)

/**
 * POST /api/evals?agentName=...&activationName=...
 * Creates an eval. The body is forwarded as-is; the backend validates it
 * (interval >= 5 minutes, payload matching type, assertion limits).
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const body = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 })
      }

      const created = await ctx.client.post<unknown>(ctx.basePath, body)
      return NextResponse.json(created, { status: 201 })
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to create eval')
    }
  }
)
