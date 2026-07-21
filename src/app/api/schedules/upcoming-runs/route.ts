import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

function schedulesBasePath(tenantId: string, agentName: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentName)}/schedules`
}

/**
 * GET /api/schedules/upcoming-runs?agentName=...&scheduleId=...&count=...
 * Returns the next scheduled executions for a schedule.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const scheduleId = searchParams.get('scheduleId')
      const count = searchParams.get('count') || '10'

      if (!agentName || !scheduleId) {
        return NextResponse.json(
          { error: 'agentName and scheduleId are required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `${schedulesBasePath(tenantId, agentName)}/upcoming-runs?scheduleId=${encodeURIComponent(scheduleId)}&count=${encodeURIComponent(count)}`
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch upcoming runs', details: error.response },
        { status: error.status || 500 }
      )
    }
  }
)
