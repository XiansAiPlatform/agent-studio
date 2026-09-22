import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * POST /api/messaging/threads/[threadId]/read
 *
 * Marks every message in the thread up to a cutoff as read. The cutoff is given as
 * either `timestamp` or `messageId` in the body (exactly one, forwarded as-is to the
 * Admin API). Tenant is injected from session (httpOnly cookie).
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantId, params }: ApiContext<{ threadId: string }>) => {
    try {
      const threadId = encodeSafePathSegment(params.threadId)
      if (!threadId) {
        return NextResponse.json(
          { error: 'threadId is required and must be a valid identifier' },
          { status: 400 }
        )
      }

      const body = await request.json().catch(() => ({}))

      const xiansClient = createXiansClient()
      const result = await xiansClient.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/messaging/threads/${threadId}/read`,
        body
      )

      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
