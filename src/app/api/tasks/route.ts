import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { requireParticipantAdmin } from '@/lib/api/auth'
import { createXiansClient } from '@/lib/xians/client'

/**
 * GET /api/tasks
 * List tasks or fetch single task by ID. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session, tenantId: cookieTenantId }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const taskId = searchParams.get('taskId')

      const participantId = session.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const topic = searchParams.get('topic')
      const status = searchParams.get('status')
      const viewType = searchParams.get('viewType') || 'my'

      // Only the caller's own tasks are unrestricted. Any tenant-wide view
      // ("everyone") or fetch of an arbitrary task by id is an admin/reviewer
      // action and requires Agent Settings access — otherwise a plain
      // participant could read every task in the tenant by editing the URL.
      const isOwnTasksView = viewType === 'my' && !taskId
      if (!isOwnTasksView) {
        const authError = await requireParticipantAdmin(session, cookieTenantId)
        if (authError) return authError
      }

      if (taskId) {
        const client = createXiansClient((session as any)?.accessToken)
        const response = await client.get<any>(
          `/api/v1/admin/tenants/${tenantId}/tasks/by-id?taskId=${encodeURIComponent(taskId)}`
        )
        return NextResponse.json(response)
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
