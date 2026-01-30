import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMetricsStats } from '@/lib/xians/metrics';

/**
 * GET /api/tenants/[tenantId]/metrics/stats
 * Get metrics statistics for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { tenantId } = await params;

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID is required' },
      { status: 400 }
    );
  }

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate query parameters are required' },
      { status: 400 }
    );
  }

  // Get optional filter parameters
  const filters = {
    agentName: searchParams.get('agentName') || undefined,
    activationName: searchParams.get('activationName') || undefined,
    participantId: searchParams.get('participantId') || undefined,
    workflowType: searchParams.get('workflowType') || undefined,
    model: searchParams.get('model') || undefined,
  };

  try {
    console.log(`[Metrics Stats API] Fetching stats for tenant: ${tenantId}, period: ${startDate} to ${endDate}, filters:`, filters);
    
    const data = await getMetricsStats(tenantId, startDate, endDate, filters);
    
    console.log(`[Metrics Stats API] Successfully fetched stats for tenant: ${tenantId}`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[Metrics Stats API] Error fetching stats for tenant "${tenantId}":`, error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch metrics stats',
      },
      { status: error.status || 500 }
    );
  }
}
