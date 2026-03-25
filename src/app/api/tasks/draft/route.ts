import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'

/**
 * PUT /api/tasks/draft
 * Update task's draft. Tenant is injected from session (httpOnly cookie).
 */
export const PUT = withTenantFromSession(
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
      const { updatedDraft } = body

      if (!updatedDraft) {
        return NextResponse.json(
          { error: 'Updated draft is required' },
          { status: 400 }
        )
      }

      const client = createXiansClient((session as any)?.accessToken)
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
