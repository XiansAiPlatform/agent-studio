import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

function extractRecordIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/data\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * DELETE /api/data/[recordId]
 * Delete a single data record.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    const recordId = extractRecordIdFromPath(new URL(request.url).pathname);

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    try {
      const xiansClient = createXiansClient((session as any)?.accessToken);

      const response = await xiansClient.delete(
        `/api/v1/admin/tenants/${tenantId}/data/${recordId}`
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
