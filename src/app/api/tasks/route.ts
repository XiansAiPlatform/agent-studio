import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * GET /api/tasks
 * List tasks or fetch single task by ID. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const taskId = searchParams.get('taskId')

      if (taskId) {
        const client = createXiansClient((session as any)?.accessToken)
        const response = await client.get<any>(
          `/api/v1/admin/tenants/${tenantId}/tasks/by-id?taskId=${encodeURIComponent(taskId)}`
        )
        return NextResponse.json(response)
      }

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const topic = searchParams.get('topic')
      const status = searchParams.get('status')
      const viewType = searchParams.get('viewType') || 'my'

      const participantId = session.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      const xiansParams = new URLSearchParams()
      if (viewType === 'my') xiansParams.append('participantId', participantId)
      if (agentName) xiansParams.append('agentName', agentName)
      if (activationName) xiansParams.append('activationName', activationName)
      if (topic) xiansParams.append('topic', topic)
      if (status) xiansParams.append('status', status)

      const client = createXiansClient((session as any)?.accessToken)
      const response = await client.get<any>(
        `/api/v1/admin/tenants/${tenantId}/tasks?${xiansParams.toString()}`
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        {
          error: error.response?.data?.message || error.message || 'Failed to fetch tasks',
          details: error.response?.data?.details || error.response?.data,
        },
        { status: error.response?.status || 500 }
      )
    }
  }
)
