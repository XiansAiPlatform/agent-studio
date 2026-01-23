import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const PUT = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract workflowId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    // The path is: /api/tenants/{tenantId}/tasks/{workflowId}/draft
    // So workflowId is at index length - 2
    const encodedWorkflowId = pathParts[pathParts.length - 2];

    if (!encodedWorkflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Decode the workflowId since it comes URL encoded from the path
    const workflowId = decodeURIComponent(encodedWorkflowId);

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
    
    // Call Xians API
    const response = await client.put<any>(
      `/api/v1/admin/tenants/${tenantId}/tasks/${encodeURIComponent(workflowId)}/draft`,
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
