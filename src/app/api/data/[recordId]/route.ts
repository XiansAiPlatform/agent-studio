import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { encodeSafePathSegment } from '@/lib/api/path-segment';
import { createXiansClient } from '@/lib/xians/client';
import { assertCanEditAgent } from '@/lib/auth/agent-access';

/**
 * DELETE /api/data/[recordId]
 * Delete a single data record.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId, params }: ApiContext<{ recordId: string }>) => {
    const recordId = encodeSafePathSegment(params.recordId);

    if (!recordId) {
      return NextResponse.json(
        { error: 'recordId is required and must be a valid identifier' },
        { status: 400 }
      );
    }

    const agentName = request.nextUrl.searchParams.get('agentName');
    const denied = await assertCanEditAgent(session, tenantId, agentName);
    if (denied) return denied;

    try {
      const xiansClient = createXiansClient((session as any)?.accessToken);

      const response = await xiansClient.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/data/${recordId}`
      );

      return NextResponse.json(response);
    } catch (error: any) {
      console.error('[Individual Data Delete API] Error:', error);

      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        );
      }

      if (error.status === 403) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to delete record' },
        { status: error.status || 500 }
      );
    }
  }
);
