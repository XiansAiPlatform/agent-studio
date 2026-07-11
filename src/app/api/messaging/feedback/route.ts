import { NextRequest, NextResponse } from 'next/server'
import {
  withTenantFromSession,
  withParticipantAdmin,
  ApiContext,
} from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * Append the optional feedback filter query params (rating, agentName, date range)
 * from the incoming request onto the upstream query string.
 */
function appendFeedbackFilters(target: URLSearchParams, source: URLSearchParams) {
  const rating = source.get('rating')
  const agentName = source.get('agentName')
  const startDate = source.get('startDate')
  const endDate = source.get('endDate')

  if (rating) target.set('rating', rating)
  if (agentName) target.set('agentName', agentName)
  if (startDate) target.set('startDate', startDate)
  if (endDate) target.set('endDate', endDate)
}

/**
 * GET /api/messaging/feedback
 * Paginated, filterable list of feedback for the current tenant (newest first).
 * Restricted to users with Agent Settings access.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const upstream = new URLSearchParams()
      appendFeedbackFilters(upstream, searchParams)
      upstream.set('page', searchParams.get('page') || '1')
      upstream.set('pageSize', searchParams.get('pageSize') || '20')

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/feedback?${upstream.toString()}`
      const response = await xiansClient.get(path)

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)

/**
 * POST /api/messaging/feedback
 * Submit message feedback. Proxies to the Xians Admin API.
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const body = await request.json()

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      // Admin API (API-key) path resolves the tenant authoritatively from the route.
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/feedback`
      const response = await xiansClient.post<{ id: string }>(path, body)

      return NextResponse.json(response, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
