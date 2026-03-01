import { NextRequest, NextResponse } from 'next/server';
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';

function extractKnowledgeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/knowledge\/([^/]+)\/override/);
  return match ? match[1] : null;
}

/**
 * POST /api/knowledge/[knowledgeId]/override
 * Create a knowledge override at tenant or activation level.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    try {
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

      const client = createXiansClient();
      let overrideUrl = `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}/override/${targetLevel}`;
      if (targetLevel === 'activation' && activationName) {
        overrideUrl += `?activationName=${encodeURIComponent(activationName)}`;
      }

      const response = await client.post<KnowledgeItem>(overrideUrl);
      return NextResponse.json(response);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create knowledge override';
      console.error('[Knowledge Override API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);
