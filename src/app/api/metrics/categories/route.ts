import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { getMetricsCategories } from '@/lib/xians/metrics'

/**
 * GET /api/metrics/categories
 * Get metrics categories overview. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const filters = {
      agentName: searchParams.get('agentName') || undefined,
      activationName: searchParams.get('activationName') || undefined,
    }

    try {
      const data = await getMetricsCategories(
        tenantId,
        startDate,
        endDate,
        filters,
        (session as any)?.accessToken
      )
      return NextResponse.json(data)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch metrics categories' },
        { status: error.status || 500 }
      )
    }
  }
)
