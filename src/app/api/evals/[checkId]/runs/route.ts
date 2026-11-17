import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { evalsErrorResponse, prepareEvalRequest } from '@/lib/xians/evals'

type Params = { checkId: string }

const FORWARDED_PARAMS = ['status', 'from', 'to', 'page', 'pageSize'] as const

/**
 * GET /api/evals/{checkId}/runs?agentName=...&activationName=...&status=&page=&pageSize=
 * Returns the eval's runs, newest first, one page at a time.
 */
export const GET = withTenantAdmin<Params>(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<Params>) => {
    try {
      const checkId = encodeSafePathSegment(params.checkId)
      if (!checkId) {
        return NextResponse.json({ error: 'Invalid eval id' }, { status: 400 })
      }

      const ctx = await prepareEvalRequest(request, session, tenantId)
      if (ctx instanceof NextResponse) return ctx

      const { searchParams } = new URL(request.url)
      const upstream = new URLSearchParams()
      for (const key of FORWARDED_PARAMS) {
        const value = searchParams.get(key)
        if (value) upstream.set(key, value)
      }

      const query = upstream.toString()
      const runs = await ctx.client.get<unknown>(`${ctx.basePath}/${checkId}/runs${query ? `?${query}` : ''}`)
      return NextResponse.json(runs)
    } catch (error) {
      return evalsErrorResponse(error, 'Failed to load eval runs')
    }
  }
)
