import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const PUT = withTenant(async (request: NextRequest, context: ApiContext) => {
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
    const { updatedDraft } = body;

    if (!updatedDraft) {
      return NextResponse.json(
        { error: 'Updated draft is required' },
        { status: 400 }
      );
    }

    console.log('[Task Draft API] Updating draft:', {
      tenantId,
      workflowId,
      draftLength: updatedDraft.length,
    });

    const client = createXiansClient();
    
    // Call Xians API using query parameter
    const response = await client.put<any>(
      `/api/v1/admin/tenants/${tenantId}/tasks/draft?taskId=${encodeURIComponent(workflowId)}`,
      {
        updatedDraft,
      }
    );

    console.log('[Task Draft API] Draft updated successfully');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Task Draft API] Error updating draft:', error);

    const errorMessage = error.message || 'Failed to update draft';
    const status = error.status || 500;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status }
    );
  }
});
