import { NextRequest, NextResponse } from 'next/server';
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

/**
 * DELETE /api/knowledge/versions
 * Delete all versions of a knowledge item at tenant or activation level.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const DELETE = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      const level = searchParams.get('level');
      const agentName = searchParams.get('agentName');
      const activationName = searchParams.get('activationName');

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

      const client = createXiansClient();
      const params = new URLSearchParams({ agentName });
      if (level === 'activation' && activationName) {
        params.append('activationName', activationName);
      }

      const response = await client.delete(
        `/api/v1/admin/tenants/${tenantId}/knowledge/${encodeURIComponent(name)}/${level}/versions?${params}`
      );

      return NextResponse.json(response || { success: true, deletedCount: 0 });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete all versions';
      console.error('[Knowledge Versions API] Error:', error);
      return NextResponse.json(
        { error: message },
        { status: (error as { status?: number })?.status ?? 500 }
      );
    }
  }
);
