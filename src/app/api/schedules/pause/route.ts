import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

function schedulesBasePath(tenantId: string, agentName: string): string {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agents/${encodeURIComponent(agentName)}/schedules`
}

/**
 * POST /api/schedules/pause?agentName=...&scheduleId=...&note=...
 * Pauses (suspends) a schedule so it stops triggering new runs.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const scheduleId = searchParams.get('scheduleId')
      const note = searchParams.get('note')

      if (!agentName || !scheduleId) {
        return NextResponse.json(
          { error: 'agentName and scheduleId are required' },
          { status: 400 }
        )
      }

      const params = new URLSearchParams({ scheduleId })
      if (note) params.set('note', note)

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.post<any>(
        `${schedulesBasePath(tenantId, agentName)}/pause?${params.toString()}`
      )
      return NextResponse.json(response ?? { success: true })
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to pause schedule', details: error.response },
        { status: error.status || 500 }
      )
    }
  }
)
