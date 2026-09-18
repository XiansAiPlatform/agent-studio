import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient, XiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';
import { assertCanEditAgent } from '@/lib/auth/agent-access';
import type { Session } from 'next-auth';

function extractKnowledgeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/knowledge\/([^/]+)/);
  return match ? match[1] : null;
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
    `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`
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
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

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
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

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
        `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`,
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
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    try {
      const client = createXiansClient();
      const [, denied] = await loadItemIfEditable(client, session, tenantId, knowledgeId);
      if (denied) return denied;

      await client.delete(
        `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`
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
