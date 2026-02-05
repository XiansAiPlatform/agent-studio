import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const POST = withTenant(async (request: NextRequest, context: ApiContext) => {
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

    // Get request body
    const body = await request.json();
    const { action, comment } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    console.log('[Task Action API] Performing action:', {
      tenantId,
      workflowId,
      action,
      hasComment: !!comment,
    });

    const client = createXiansClient();
    
    // Call Xians API using query parameter
    const response = await client.post<any>(
      `/api/v1/admin/tenants/${tenantId}/tasks/actions?taskId=${encodeURIComponent(workflowId)}`,
      {
        action,
        comment: comment || undefined,
      }
    );

    console.log('[Task Action API] Action performed successfully');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Task Action API] Error performing action:', error);

    const errorMessage = error.message || 'Failed to perform action';
    const status = error.status || 500;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status }
    );
  }
});
