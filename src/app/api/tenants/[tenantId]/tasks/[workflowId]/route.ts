import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const GET = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract workflowId from query parameters
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('taskId');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'taskId query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Task Detail API] Fetching task:', {
      tenantId,
      workflowId,
    });

    const client = createXiansClient();
    
    // Call Xians API using query parameter
    const response = await client.get<any>(
      `/api/v1/admin/tenants/${tenantId}/tasks/by-id?taskId=${encodeURIComponent(workflowId)}`
    );

    console.log('[Task Detail API] Task fetched successfully');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Task Detail API] Error fetching task:', error);

    const errorMessage = error.message || 'Failed to fetch task details';
    const status = error.status || 500;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status }
    );
  }
});
