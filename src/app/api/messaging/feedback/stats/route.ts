import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/messaging/feedback/stats
 * Aggregated feedback statistics (total, average rating, per-rating and
 * per-reason counts) for the current tenant. Restricted to users with Agent
 * Settings access.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const upstream = new URLSearchParams()

      const rating = searchParams.get('rating')
      const agentName = searchParams.get('agentName')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (rating) upstream.set('rating', rating)
      if (agentName) upstream.set('agentName', agentName)
      if (startDate) upstream.set('startDate', startDate)
      if (endDate) upstream.set('endDate', endDate)

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const query = upstream.toString()
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/feedback/stats${query ? `?${query}` : ''}`
      const response = await xiansClient.get(path)

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
