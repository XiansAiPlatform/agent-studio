import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * Build the AdminApi schedules base path for the current tenant + agent.
 * Mirrors AdminScheduleEndpoints:
 *   /api/v1/admin/tenants/{tenantId}/agents/{agentName}/schedules
 */
function schedulesBasePath(tenantId: string, agentName: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentName)}/schedules`
}

function errorResponse(error: any) {
  return NextResponse.json(
    {
      error: error.message || 'Schedule request failed',
      details: error.response,
    },
    { status: error.status || 500 }
  )
}

/**
 * GET /api/schedules?agentName=...&status=...&workflowType=...&searchTerm=...&pageSize=...&pageToken=...
 * Lists schedules for an agent. Tenant is resolved server-side from the session cookie.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')

      if (!agentName) {
        return NextResponse.json(
          { error: 'agentName is required' },
          { status: 400 }
        )
      }

      const upstreamParams = new URLSearchParams()
      const workflowType = searchParams.get('workflowType')
      const status = searchParams.get('status')
      const searchTerm = searchParams.get('searchTerm')
      const pageSize = searchParams.get('pageSize')
      const pageToken = searchParams.get('pageToken')
      if (workflowType) upstreamParams.set('workflowType', workflowType)
      if (status) upstreamParams.set('status', status)
      if (searchTerm) upstreamParams.set('searchTerm', searchTerm)
      if (pageSize) upstreamParams.set('pageSize', pageSize)
      if (pageToken) upstreamParams.set('pageToken', pageToken)

      const query = upstreamParams.toString()
      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `${schedulesBasePath(tenantId, agentName)}${query ? `?${query}` : ''}`
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return errorResponse(error)
    }
  }
)

/**
 * DELETE /api/schedules?agentName=...
 * Deletes ALL schedules for the agent. This action cannot be undone.
 */
export const DELETE = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')

      if (!agentName) {
        return NextResponse.json(
          { error: 'agentName is required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.delete<any>(
        schedulesBasePath(tenantId, agentName)
      )
      return NextResponse.json(response ?? { success: true })
    } catch (error: any) {
      return errorResponse(error)
    }
  }
)
