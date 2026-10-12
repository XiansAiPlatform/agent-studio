import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { evalsErrorResponse, prepareEvalRequest } from '@/lib/xians/evals'

type Params = { checkId: string }

function invalidCheckId() {
  return NextResponse.json({ error: 'Invalid eval id' }, { status: 400 })
}

/**
 * PUT /api/evals/{checkId}?agentName=...&activationName=...
 * Replaces an eval's definition (including enable/disable). The type is immutable.
 */
export const PUT = withTenantAdmin<Params>(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<Params>) => {
    try {
      const checkId = encodeSafePathSegment(params.checkId)
      if (!checkId) return invalidCheckId()

      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const body = await request.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'A JSON body is required' }, { status: 400 })
      }

      const updated = await ctx.client.put<unknown>(`${ctx.basePath}/${checkId}`, body)
      return NextResponse.json(updated)
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to update eval')
    }
  }
)

/**
 * DELETE /api/evals/{checkId}?agentName=...&activationName=...
 * Deletes the eval, its schedule and its run history.
 */
export const DELETE = withTenantAdmin<Params>(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<Params>) => {
    try {
      const checkId = encodeSafePathSegment(params.checkId)
      if (!checkId) return invalidCheckId()

      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      await ctx.client.delete<void>(`${ctx.basePath}/${checkId}`)
      return NextResponse.json({ success: true })
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to delete eval')
    }
  }
)
