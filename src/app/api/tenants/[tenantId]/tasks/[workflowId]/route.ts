import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const GET = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract workflowId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const encodedWorkflowId = pathParts[pathParts.length - 1];

    if (!encodedWorkflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Decode the workflowId since it comes URL encoded from the path
    const workflowId = decodeURIComponent(encodedWorkflowId);

    console.log('[Task Detail API] Fetching task:', {
      tenantId,
      workflowId,
    });

    const client = createXiansClient();
    
    // Call Xians API - encode it again for the HTTP request
    const response = await client.get<any>(
      `/api/v1/admin/tenants/${tenantId}/tasks/${encodeURIComponent(workflowId)}`
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
