import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

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
 * GET /api/schedules/by-id?agentName=...&scheduleId=...
 * Returns a single schedule belonging to the agent.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const scheduleId = searchParams.get('scheduleId')

      if (!agentName || !scheduleId) {
        return NextResponse.json(
          { error: 'agentName and scheduleId are required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `${schedulesBasePath(tenantId, agentName)}/by-id?scheduleId=${encodeURIComponent(scheduleId)}`
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return errorResponse(error)
    }
  }
)

/**
 * DELETE /api/schedules/by-id?agentName=...&scheduleId=...
 * Deletes a single schedule belonging to the agent.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const agentName = searchParams.get('agentName')
      const scheduleId = searchParams.get('scheduleId')

      if (!agentName || !scheduleId) {
        return NextResponse.json(
          { error: 'agentName and scheduleId are required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.delete<any>(
        `${schedulesBasePath(tenantId, agentName)}/by-id?scheduleId=${encodeURIComponent(scheduleId)}`
      )
      return NextResponse.json(response ?? { success: true })
    } catch (error: any) {
      return errorResponse(error)
    }
  }
)
