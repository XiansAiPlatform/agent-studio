import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';

export const GET = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract knowledgeId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const knowledgeId = pathParts[pathParts.length - 1];

    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    console.log('[Knowledge Item API] Fetching knowledge item:', {
      tenantId,
      knowledgeId,
    });

    const client = createXiansClient();
    
    // Call Xians API
    const response = await client.get<KnowledgeItem>(
      `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`
    );

    console.log('[Knowledge Item API] Fetched knowledge item');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Knowledge Item API] Error fetching knowledge item:', error);

    const errorMessage = error.message || 'Failed to fetch knowledge item';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});

export const PATCH = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract knowledgeId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const knowledgeId = pathParts[pathParts.length - 1];

    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, type, version } = body;

    if (!content || !type || !version) {
      return NextResponse.json(
        { error: 'content, type, and version are required' },
        { status: 400 }
      );
    }

    console.log('[Knowledge Item API] Updating knowledge item:', {
      tenantId,
      knowledgeId,
      type,
    });

    const client = createXiansClient();
    
    // Call Xians API to update knowledge (creates new version)
    const response = await client.patch<KnowledgeItem>(
      `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`,
      {
        content,
        type,
        version,
      }
    );

    console.log('[Knowledge Item API] Updated knowledge item');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Knowledge Item API] Error updating knowledge item:', error);

    const errorMessage = error.message || 'Failed to update knowledge item';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});

export const DELETE = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    
    // Extract knowledgeId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const knowledgeId = pathParts[pathParts.length - 1];

    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    console.log('[Knowledge Item API] Deleting knowledge version:', {
      tenantId,
      knowledgeId,
    });

    const client = createXiansClient();
    
    // Call Xians API to delete knowledge version
    const response = await client.delete(
      `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`
    );

    console.log('[Knowledge Item API] Deleted knowledge version successfully');

    return NextResponse.json(response || { success: true });
  } catch (error: any) {
    console.error('[Knowledge Item API] Error deleting knowledge version:', error);

    const errorMessage = error.message || 'Failed to delete knowledge version';
    const status = error.status || 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
});
