import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * POST /api/messaging/feedback
 * Submit message feedback. Proxies to Xians User API.
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const body = await request.json()

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      // User API JWT/OIDC path expects tenantId query (same as /api/user/rest/send, etc.)
      const path = `/api/user/rest/feedback?tenantId=${encodeURIComponent(tenantId)}`
      const response = await xiansClient.post<{ id: string }>(path, body)

      return NextResponse.json(response, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
