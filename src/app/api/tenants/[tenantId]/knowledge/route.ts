import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeApiResponse } from '@/lib/xians/knowledge';

export const GET = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    const { searchParams } = new URL(request.url);
    
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');

    if (!agentName) {
      return NextResponse.json(
        { error: 'agentName query parameter is required' },
        { status: 400 }
      );
    }

    if (!activationName) {
      return NextResponse.json(
        { error: 'activationName query parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Knowledge API] Fetching knowledge:', {
      tenantId,
      agentName,
      activationName,
    });

    const client = createXiansClient();
    
    // Build query params
    const queryParams = new URLSearchParams({
      agentName,
      activationName,
    });

    // Call Xians API
    const response = await client.get<KnowledgeApiResponse>(
      `/api/v1/admin/tenants/${tenantId}/knowledge?${queryParams.toString()}`
    );

    console.log('[Knowledge API] Fetched', response.groups?.length || 0, 'knowledge groups');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Knowledge API] Error fetching knowledge:', error);

    const errorMessage = error.message || 'Failed to fetch knowledge';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});
