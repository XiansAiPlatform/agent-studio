import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * Request IDs are GUIDs. Anything else is refused rather than passed into the server's
 * `property=key:value1,value2` filter, where a comma would split it into several values.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/**
 * GET /api/logs
 * Fetch logs with optional filters. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const params = new URLSearchParams()
      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const workflowId = searchParams.get('workflowId')
      const workflowType = searchParams.get('workflowType')
      const logLevel = searchParams.get('logLevel')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const search = searchParams.get('search')?.trim()
      const includeChildWorkflows = searchParams.get('includeChildWorkflows') === 'true'
      const requestId = searchParams.get('requestId')?.trim()
      if (requestId && !REQUEST_ID_PATTERN.test(requestId)) {
        return NextResponse.json({ error: 'requestId is not a valid request ID' }, { status: 400 })
      }
      const pageSize = searchParams.get('pageSize') || '20'
      const page = searchParams.get('page') || '1'

      if (agentName) params.set('agentName', agentName)
      if (activationName) params.set('activationName', activationName)
      if (workflowId) params.set('workflowId', workflowId)
      if (workflowType) params.set('workflowType', workflowType)
      if (includeChildWorkflows) params.set('includeChildWorkflows', 'true')
      // Logs the agent wrote while handling this request, in any workflow or activity it reached.
      if (requestId) params.append('property', `requestId:${requestId}`)
      if (logLevel) params.set('logLevel', logLevel)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (search) params.set('search', search)
      params.set('pageSize', pageSize)
      params.set('page', page)

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `/api/v1/admin/tenants/${tenantId}/logs?${params.toString()}`
      )

      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch logs' },
        { status: error.status || 500 }
      )
    }
  }
)
