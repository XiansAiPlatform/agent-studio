import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { encodeSafePathSegment } from '@/lib/api/path-segment';
import { createXiansClient, XiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';
import { assertCanEditAgent } from '@/lib/auth/agent-access';
import type { Session } from 'next-auth';

function requireKnowledgeId(raw: string | undefined): string | NextResponse {
  const knowledgeId = encodeSafePathSegment(raw);
  if (!knowledgeId) {
    return NextResponse.json(
      { error: 'knowledgeId is required and must be a valid identifier' },
      { status: 400 }
    );
  }
  return knowledgeId;
}

/**
 * A knowledge item is addressed by id here, not by agent, so we resolve the
 * owning agent from the item itself and check the caller may edit it.
 * Returns [item, null] when allowed, or [null, errorResponse] otherwise.
 */
async function loadItemIfEditable(
  client: XiansClient,
  session: Session,
  tenantId: string,
  knowledgeId: string
): Promise<[KnowledgeItem, null] | [null, NextResponse]> {
  const item = await client.get<KnowledgeItem>(
    `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/knowledge/${knowledgeId}`
  );
  const denied = await assertCanEditAgent(session, tenantId, item?.agent);
  if (denied) return [null, denied];
  return [item, null];
}

/**
 * GET /api/knowledge/[knowledgeId]
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 * Restricted to users with Agent Settings access (excludes plain participants).
 */
export const GET = withParticipantAdmin(
  async (_request: NextRequest, { session, tenantId, params }: ApiContext<{ knowledgeId: string }>) => {
    const knowledgeId = requireKnowledgeId(params.knowledgeId);
    if (knowledgeId instanceof NextResponse) return knowledgeId;

    try {
      const client = createXiansClient();
      const [item, denied] = await loadItemIfEditable(client, session, tenantId, knowledgeId);
      if (denied) return denied;
      return NextResponse.json(item);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to fetch knowledge item';
      console.error('[Knowledge Item API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);

/**
 * PATCH /api/knowledge/[knowledgeId]
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 * Restricted to users with Agent Settings access (excludes plain participants).
 */
export const PATCH = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<{ knowledgeId: string }>) => {
    const knowledgeId = requireKnowledgeId(params.knowledgeId);
    if (knowledgeId instanceof NextResponse) return knowledgeId;

    try {
      const body = await request.json();
      const { content, type, version } = body;

      if (!content || !type || !version) {
        return NextResponse.json(
          { error: 'content, type, and version are required' },
          { status: 400 }
        );
      }

      const client = createXiansClient();
      const [, denied] = await loadItemIfEditable(client, session, tenantId, knowledgeId);
      if (denied) return denied;

      const response = await client.patch<KnowledgeItem>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/knowledge/${knowledgeId}`,
        { content, type, version }
      );
      return NextResponse.json(response);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update knowledge item';
      console.error('[Knowledge Item API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);

/**
 * DELETE /api/knowledge/[knowledgeId]
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 * Restricted to users with Agent Settings access (excludes plain participants).
 */
export const DELETE = withParticipantAdmin(
  async (_request: NextRequest, { session, tenantId, params }: ApiContext<{ knowledgeId: string }>) => {
    const knowledgeId = requireKnowledgeId(params.knowledgeId);
    if (knowledgeId instanceof NextResponse) return knowledgeId;

    try {
      const client = createXiansClient();
      const [, denied] = await loadItemIfEditable(client, session, tenantId, knowledgeId);
      if (denied) return denied;

      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/knowledge/${knowledgeId}`
      );
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete knowledge version';
      console.error('[Knowledge Item API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);
