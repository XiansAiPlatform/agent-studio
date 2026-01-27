import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

export const DELETE = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Get query parameters
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const level = url.searchParams.get('level');
    const agentName = url.searchParams.get('agentName');
    const activationName = url.searchParams.get('activationName');

    if (!name) {
      return NextResponse.json(
        { error: 'name query parameter is required' },
        { status: 400 }
      );
    }

    if (!level || (level !== 'tenant' && level !== 'activation')) {
      return NextResponse.json(
        { error: 'level query parameter must be either "tenant" or "activation"' },
        { status: 400 }
      );
    }

    if (!agentName) {
      return NextResponse.json(
        { error: 'agentName query parameter is required' },
        { status: 400 }
      );
    }

    if (level === 'activation' && !activationName) {
      return NextResponse.json(
        { error: 'activationName query parameter is required when level is "activation"' },
        { status: 400 }
      );
    }

    console.log('[Knowledge Versions API] Deleting all versions:', {
      tenantId,
      name,
      level,
      agentName,
      activationName,
    });

    const client = createXiansClient();
    
    // Build query params for Xians API
    const params = new URLSearchParams({ agentName });
    if (level === 'activation' && activationName) {
      params.append('activationName', activationName);
    }

    // Call Xians API to delete all versions
    const response = await client.delete(
      `/api/v1/admin/tenants/${tenantId}/knowledge/${encodeURIComponent(name)}/${level}/versions?${params}`
    );

    console.log('[Knowledge Versions API] Deleted all versions successfully');

    return NextResponse.json(response || { success: true });
  } catch (error: any) {
    console.error('[Knowledge Versions API] Error deleting all versions:', error);

    const errorMessage = error.message || 'Failed to delete all versions';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});
