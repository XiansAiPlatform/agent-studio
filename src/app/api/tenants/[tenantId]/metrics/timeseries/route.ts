import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMetricsTimeseries } from '@/lib/xians/metrics';

/**
 * GET /api/tenants/[tenantId]/metrics/timeseries
 * Get metrics timeseries data for a tenant
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
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const groupBy = searchParams.get('groupBy') || 'day';

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate query parameters are required' },
      { status: 400 }
    );
  }

  if (!category || !type) {
    return NextResponse.json(
      { error: 'category and type query parameters are required' },
      { status: 400 }
    );
  }

  // Validate groupBy parameter
  if (!['day', 'week', 'month'].includes(groupBy)) {
    return NextResponse.json(
      { error: 'groupBy must be one of: day, week, month' },
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
    console.log(`[Metrics Timeseries API] Fetching timeseries for tenant: ${tenantId}, category: ${category}, type: ${type}, groupBy: ${groupBy}, period: ${startDate} to ${endDate}, filters:`, filters);
    
    const data = await getMetricsTimeseries(
      tenantId,
      category,
      type,
      startDate,
      endDate,
      groupBy,
      filters
    );
    
    console.log(`[Metrics Timeseries API] Successfully fetched timeseries for tenant: ${tenantId}`);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`[Metrics Timeseries API] Error fetching timeseries for tenant "${tenantId}":`, error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch metrics timeseries',
      },
      { status: error.status || 500 }
    );
  }
}
