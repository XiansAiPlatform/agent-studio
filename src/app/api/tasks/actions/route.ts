import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * POST /api/tasks/actions
 * Perform task action (approve/reject/etc.) on any task in the tenant. This is a
 * reviewer action, so it is gated to Agent Settings access — a plain participant
 * must not be able to act on arbitrary tasks by editing the taskId in the URL.
 * Tenant is injected from session (httpOnly cookie).
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
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

      const client = createXiansClient((session as any)?.accessToken)
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
