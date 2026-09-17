import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { authorizeTaskAccess, fetchTaskById } from '@/lib/api/task-access'

/**
 * PUT /api/tasks/draft
 * Update a task's draft. The caller may edit only when session participantId
 * equals the task owner; otherwise Agent Settings access is required.
 * Tenant is injected from session (httpOnly cookie).
 */
export const PUT = withTenantFromSession(
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
      const { updatedDraft } = body

      if (!updatedDraft) {
        return NextResponse.json(
          { error: 'Updated draft is required' },
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
      const response = await client.put<any>(
        `/api/v1/admin/tenants/${tenantId}/tasks/draft?taskId=${encodeURIComponent(workflowId)}`,
        { updatedDraft }
      )
      return NextResponse.json(response)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to update draft' },
        { status: error.status || 500 }
      )
    }
  }
)
