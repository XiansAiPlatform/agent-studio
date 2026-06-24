import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/messaging/feedback/[feedbackId]
 * Single feedback entry together with the surrounding thread messages for
 * context. Restricted to users with Agent Settings access.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      // The dynamic route segment is the last path part of the request URL.
      const { pathname, searchParams } = new URL(request.url)
      const feedbackId = decodeURIComponent(pathname.split('/').pop() || '')

      if (!feedbackId) {
        return NextResponse.json(
          { error: 'feedbackId is required' },
          { status: 400 }
        )
      }

      const upstream = new URLSearchParams()
      upstream.set('contextBefore', searchParams.get('contextBefore') || '5')
      upstream.set('contextAfter', searchParams.get('contextAfter') || '5')
      upstream.set('chatOnly', searchParams.get('chatOnly') || 'false')

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/feedback/${encodeURIComponent(feedbackId)}?${upstream.toString()}`
      const response = await xiansClient.get(path)

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
