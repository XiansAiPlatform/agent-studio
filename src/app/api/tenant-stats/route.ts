import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { getTenantStats } from '@/lib/xians/tasks'

/**
 * GET /api/tenant-stats
 * Get tenant statistics (tasks and messages) for a date range.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantId, session }: ApiContext) => {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      )
    }

    try {
      const stats = await getTenantStats(
        tenantId,
        startDate,
        endDate,
        (session as { accessToken?: string }).accessToken
      )
      return NextResponse.json(stats)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tenant stats'
      console.error('[Tenant Stats API] Error:', error)

      return NextResponse.json(
        {
          error: message,
          tasks: {
            pending: 0,
            completed: 0,
            timedOut: 0,
            cancelled: 0,
            total: 0,
          },
          messages: {
            activeUsers: 0,
            totalMessages: 0,
          },
        },
        { status: (error as { status?: number })?.status ?? 500 }
      )
    }
  }
)
