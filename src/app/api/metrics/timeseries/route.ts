import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { getMetricsTimeseries } from '@/lib/xians/metrics'


/**
 * GET /api/metrics/timeseries
 * Get metrics timeseries data. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const groupBy = searchParams.get('groupBy') || 'day'

    if (!startDate || !endDate || !category || !type) {
      return NextResponse.json(
        { error: 'startDate, endDate, category and type are required' },
        { status: 400 }
      )
    }

    if (!['day', 'week', 'month'].includes(groupBy)) {
      return NextResponse.json(
        { error: 'groupBy must be one of: day, week, month' },
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
      const data = await getMetricsTimeseries(
        tenantId,
        category,
        type,
        startDate,
        endDate,
        groupBy,
        filters,
        (session as any)?.accessToken
      )
      return NextResponse.json(data)
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch metrics timeseries' },
        { status: error.status || 500 }
      )
    }
  }
)
