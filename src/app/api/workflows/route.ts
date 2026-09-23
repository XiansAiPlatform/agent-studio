import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

function workflowsListPath(tenantId: string, query: URLSearchParams): string {
  const qs = query.toString()
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/workflows/list${qs ? `?${qs}` : ''}`
}

function errorResponse(error: unknown) {
  const err = error as { message?: string; response?: unknown; status?: number }
  return NextResponse.json(
    { error: err.message || 'Workflow list request failed', details: err.response },
    { status: err.status || 500 }
  )
}

/**
 * GET /api/workflows?agentName=&activationName=&status=&workflowType=&user=&pageSize=&pageToken=
 * Tenant Admin / System Admin only. Maps activationName → idPostfix for Admin API.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')

      if (!agentName) {
        return NextResponse.json({ error: 'agentName is required' }, { status: 400 })
      }
      if (!activationName) {
        return NextResponse.json({ error: 'activationName is required' }, { status: 400 })
      }

      const upstream = new URLSearchParams()
      upstream.set('agent', agentName)
      upstream.set('idPostfix', activationName)

      const status = searchParams.get('status')
      const workflowType = searchParams.get('workflowType')
      const user = searchParams.get('user')
      const pageSize = searchParams.get('pageSize')
      const pageToken = searchParams.get('pageToken')
      if (status && status !== 'all') upstream.set('status', status)
      if (workflowType) upstream.set('workflowType', workflowType)
      if (user) upstream.set('user', user)
      if (pageSize) upstream.set('pageSize', pageSize)
      if (pageToken) upstream.set('pageToken', pageToken)

      const client = createXiansClient((session as { accessToken?: string })?.accessToken)
      const response = await client.get<unknown>(workflowsListPath(tenantId, upstream))
      return NextResponse.json(response)
    } catch (error) {
      return errorResponse(error)
    }
  }
)
