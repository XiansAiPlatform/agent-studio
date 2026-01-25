import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const GET = withTenant(async (request: NextRequest, { tenantId, session }: ApiContext) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');
    const topic = searchParams.get('topic');
    const status = searchParams.get('status');
    const viewType = searchParams.get('viewType') || 'my'; // Default to 'my' tasks

    // SECURITY: Get participantId from authenticated session, not from client
    const participantId = session.user?.email;

    if (!participantId) {
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 401 }
      );
    }

    console.log('[Tasks API] Fetching tasks for:', {
      tenantId,
      agentName: agentName || 'all',
      activationName: activationName || 'all',
      participantId: viewType === 'my' ? participantId : 'everyone',
      topic: topic || 'all',
      status: status || 'all',
      viewType,
    });

    const client = createXiansClient();
    
    // Build the query parameters for Xians API
    const xiansParams = new URLSearchParams();

    // Only add participantId if viewing "my" tasks
    if (viewType === 'my') {
      xiansParams.append('participantId', participantId);
    }

    // Add optional filters
    if (agentName) {
      xiansParams.append('agentName', agentName);
    }
    
    if (activationName) {
      xiansParams.append('activationName', activationName);
    }

    if (topic) {
      xiansParams.append('topic', topic);
    }

    if (status) {
      xiansParams.append('status', status);
    }

    // Call Xians API
    const response = await client.get<any>(`/api/v1/admin/tenants/${tenantId}/tasks?${xiansParams.toString()}`);

    console.log('[Tasks API] Tasks fetched successfully:', {
      taskCount: response.tasks?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Tasks API] Error fetching tasks:', error);

    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch tasks';
    const errorDetails = error.response?.data?.details || error.response?.data;

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: error.response?.status || 500 }
    );
  }
});
