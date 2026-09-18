import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { authorizeTaskAccess, fetchTaskById } from '@/lib/api/task-access'

/**
 * POST /api/tasks/actions
 * Perform a task action (approve/reject/etc.). The caller may act only when
 * session participantId equals the task owner; otherwise Agent Settings
 * access is required. Tenant is injected from session (httpOnly cookie).
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session, tenantId: cookieTenantId }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const workflowId = searchParams.get('taskId')

      if (!workflowId) {
        return NextResponse.json(
          { error: 'taskId query parameter is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { action, comment } = body

      if (!action) {
        return NextResponse.json(
          { error: 'Action is required' },
          { status: 400 }
        )
      }

      const accessToken = (session as { accessToken?: string }).accessToken
      const task = await fetchTaskById(tenantId, workflowId, accessToken)
      const accessError = await authorizeTaskAccess(session, cookieTenantId, task, {
        tenantId,
        accessToken,
      })
      if (accessError) return accessError

      const client = createXiansClient(accessToken)
      const response = await client.post<any>(
        `/api/v1/admin/tenants/${tenantId}/tasks/actions?taskId=${encodeURIComponent(workflowId)}`,
        { action, comment: comment || undefined }
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to perform action' },
        { status: error.status || 500 }
      )
    }
  }
)
