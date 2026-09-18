import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
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
  async (request: NextRequest, { tenantId }: ApiContext) => {
    try {
      // Extract the threadId from the path: /api/messaging/threads/{threadId}/read
      const segments = request.nextUrl.pathname.split('/')
      const threadId = segments[segments.length - 2]

      if (!threadId) {
        return NextResponse.json({ error: 'threadId is required' }, { status: 400 })
      }

      const body = await request.json().catch(() => ({}))

      const xiansClient = createXiansClient()
      const result = await xiansClient.post(
        `/api/v1/admin/tenants/${tenantId}/messaging/threads/${threadId}/read`,
        body
      )

      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
