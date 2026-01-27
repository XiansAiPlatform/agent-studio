import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';

export const POST = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract knowledgeId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const knowledgeIdIndex = pathParts.findIndex(part => part === 'knowledge') + 1;
    const knowledgeId = pathParts[knowledgeIdIndex];

    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { targetLevel, activationName } = body;

    if (!targetLevel || !['tenant', 'activation'].includes(targetLevel)) {
      return NextResponse.json(
        { error: 'targetLevel must be either "tenant" or "activation"' },
        { status: 400 }
      );
    }

    if (targetLevel === 'activation' && !activationName) {
      return NextResponse.json(
        { error: 'activationName is required when overriding to activation level' },
        { status: 400 }
      );
    }

    console.log('[Knowledge Override API] Creating override:', {
      tenantId,
      knowledgeId,
      targetLevel,
      activationName,
    });

    const client = createXiansClient();
    
    // Build the override URL
    let overrideUrl = `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}/override/${targetLevel}`;
    
    // Add activationName query param if overriding to activation level
    if (targetLevel === 'activation' && activationName) {
      overrideUrl += `?activationName=${encodeURIComponent(activationName)}`;
    }

    // Call Xians API to create override
    const response = await client.post<KnowledgeItem>(overrideUrl);

    console.log('[Knowledge Override API] Override created successfully');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Knowledge Override API] Error creating override:', error);

    const errorMessage = error.message || 'Failed to create knowledge override';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});
