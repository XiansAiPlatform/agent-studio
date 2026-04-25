import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * GET /api/logs/streams
 * Fetch a paginated list of log streams (distinct workflow IDs sorted by recent activity).
 * Tenant is injected from the authenticated session (httpOnly cookie) - never sent by the
 * frontend.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const params = new URLSearchParams()
      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const workflowType = searchParams.get('workflowType')
      const logLevel = searchParams.get('logLevel')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const pageSize = searchParams.get('pageSize') || '20'
      const page = searchParams.get('page') || '1'

      if (agentName) params.set('agentName', agentName)
      if (activationName) params.set('activationName', activationName)
      if (workflowType) params.set('workflowType', workflowType)
      if (logLevel) params.set('logLevel', logLevel)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      params.set('pageSize', pageSize)
      params.set('page', page)

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `/api/v1/admin/tenants/${tenantId}/logs/streams?${params.toString()}`
      )

      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch log streams' },
        { status: error.status || 500 }
      )
    }
  }
)
