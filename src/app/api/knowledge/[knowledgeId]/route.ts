import { NextRequest, NextResponse } from 'next/server';
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeItem } from '@/lib/xians/knowledge';

function extractKnowledgeIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/knowledge\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * GET /api/knowledge/[knowledgeId]
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    try {
      const client = createXiansClient();
      const response = await client.get<KnowledgeItem>(
        `/api/v1/admin/tenants/${tenantId}/knowledge/${knowledgeId}`
      );
      return NextResponse.json(response);
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
 */
export const PATCH = withTenantFromSession(
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
      const { content, type, version } = body;

      if (!content || !type || !version) {
        return NextResponse.json(
          { error: 'content, type, and version are required' },
          { status: 400 }
        );
      }

      const client = createXiansClient();
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
 */
export const DELETE = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    const knowledgeId = extractKnowledgeIdFromPath(new URL(request.url).pathname);
    if (!knowledgeId) {
      return NextResponse.json(
        { error: 'Knowledge ID is required' },
        { status: 400 }
      );
    }

    try {
      const client = createXiansClient();
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
