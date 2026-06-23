import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

function schedulesBasePath(tenantId: string, agentName: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentName)}/schedules`
}

/**
 * GET /api/schedules/history?agentName=...&scheduleId=...&count=...
 * Returns the execution history for a schedule.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const scheduleId = searchParams.get('scheduleId')
      const count = searchParams.get('count') || '50'

      if (!agentName || !scheduleId) {
        return NextResponse.json(
          { error: 'agentName and scheduleId are required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `${schedulesBasePath(tenantId, agentName)}/history?scheduleId=${encodeURIComponent(scheduleId)}&count=${encodeURIComponent(count)}`
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch schedule history', details: error.response },
        { status: error.status || 500 }
      )
    }
  }
)
