import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

function errorResponse(error: unknown) {
  const err = error as { message?: string; response?: unknown; status?: number }
  return NextResponse.json(
    { error: err.message || 'Workflow cancel request failed', details: err.response },
    { status: err.status || 500 }
  )
}

/**
 * POST /api/workflows/cancel
 * Body: { workflowId: string, force?: boolean }
 * force=false → Cancel; force=true → Terminate
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const body = (await request.json().catch(() => ({}))) as {
        workflowId?: string
        force?: boolean
      }

      const workflowId = body.workflowId?.trim()
      if (!workflowId) {
        return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
      }

      const force = body.force === true
      const params = new URLSearchParams({
        workflowId,
        force: String(force),
      })

      const client = createXiansClient((session as { accessToken?: string })?.accessToken)
      const response = await client.post<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/workflows/cancel?${params.toString()}`,
        {}
      )
      return NextResponse.json(response ?? { success: true })
    } catch (error) {
      return errorResponse(error)
    }
  }
)
