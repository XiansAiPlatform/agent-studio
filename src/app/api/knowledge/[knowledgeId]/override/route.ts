import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { encodeSafePathSegment } from '@/lib/api/path-segment';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';
import { assertCanEditAgent } from '@/lib/auth/agent-access';

/**
 * POST /api/knowledge/[knowledgeId]/override
 * Create a knowledge override at tenant or activation level.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<{ knowledgeId: string }>) => {
    const knowledgeId = encodeSafePathSegment(params.knowledgeId);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'knowledgeId is required and must be a valid identifier' },
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

      const item = await client.get<KnowledgeItem>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/knowledge/${knowledgeId}`
      );
      const denied = await assertCanEditAgent(session, tenantId, item?.agent);
      if (denied) return denied;

      let overrideUrl = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/knowledge/${knowledgeId}/override/${targetLevel}`;
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
