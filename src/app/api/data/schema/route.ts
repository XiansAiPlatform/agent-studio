import { NextRequest, NextResponse } from 'next/server';
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

/**
 * GET /api/data/schema
 * Fetch data schema for an agent and activation.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url);

      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const agentName = searchParams.get('agentName');
      const activationName = searchParams.get('activationName');

      if (!startDate || !endDate || !agentName || !activationName) {
        return NextResponse.json(
          {
            error:
              'Missing required parameters: startDate, endDate, agentName, activationName',
          },
          { status: 400 }
        );
      }

      const xiansClient = createXiansClient((session as any)?.accessToken);

      const xiansParams = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        activationName,
      });

      const response = await xiansClient.get(
        `/api/v1/admin/tenants/${tenantId}/data/schema?${xiansParams.toString()}`
      );

      return NextResponse.json(response);
    } catch (error: any) {
      console.error('[Data Schema API] Error:', error);

      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Data schema not found' },
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
        { error: error.message || 'Failed to fetch data schema' },
        { status: error.status || 500 }
      );
    }
  }
);
