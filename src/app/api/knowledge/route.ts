import { NextRequest, NextResponse } from 'next/server';
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';
import { KnowledgeApiResponse } from '@/lib/xians/knowledge';

/**
 * GET /api/knowledge
 * Fetch knowledge groups for an agent and activation.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    try {
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

      const client = createXiansClient();
      const queryParams = new URLSearchParams({ agentName, activationName });

      const response = await client.get<KnowledgeApiResponse>(
        `/api/v1/admin/tenants/${tenantId}/knowledge?${queryParams.toString()}`
      );

      return NextResponse.json(response);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch knowledge';
      console.error('[Knowledge API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);
