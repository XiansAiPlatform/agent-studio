import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getTenantStats } from '@/lib/xians/tasks'

/**
 * GET /api/tenants/[tenantId]/stats
 * Get tenant statistics (tasks and messages) for a date range
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { tenantId } = await params

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID is required' },
      { status: 400 }
    )
  }

  // Get query parameters
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
    console.log(`[Tenant Stats API] Fetching stats for tenant: ${tenantId}, period: ${startDate} to ${endDate}`)
    
    const stats = await getTenantStats(tenantId, startDate, endDate)
    
    console.log(`[Tenant Stats API] Successfully fetched stats for tenant: ${tenantId}`)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error(`[Tenant Stats API] Error fetching stats for tenant "${tenantId}":`, error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch tenant stats',
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
      { status: error.status || 500 }
    )
  }
}
