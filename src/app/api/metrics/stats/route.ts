import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { getMetricsStats } from '@/lib/xians/metrics'

/**
 * GET /api/metrics/stats
 * Get metrics statistics. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
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
      participantId: session.user?.email ?? undefined,
      workflowType: searchParams.get('workflowType') || undefined,
      model: searchParams.get('model') || undefined,
    }

    try {
      const data = await getMetricsStats(
        tenantId,
        startDate,
        endDate,
        filters,
        (session as any)?.accessToken
      )
      return NextResponse.json(data)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch metrics stats' },
        { status: error.status || 500 }
      )
    }
  }
)
