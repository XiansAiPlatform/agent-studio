import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { assertCanEditAgent } from '@/lib/auth/agent-access';
import { handleApiError, validationError } from '@/lib/api/error-handler';
import { adminDataSchemaPath, createAdminDataClient } from '@/lib/xians/admin-data';

/**
 * GET /api/data/schema
 * Fetch data schema for an agent and activation.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url);

      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const agentName = searchParams.get('agentName');
      const activationName = searchParams.get('activationName');

      if (!startDate || !endDate || !agentName || !activationName) {
        return validationError(
          'Missing required parameters: startDate, endDate, agentName, activationName'
        );
      }

      const denied = await assertCanEditAgent(session, tenantId, agentName);
      if (denied) return denied;

      const xiansParams = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        activationName,
      });

      const response = await createAdminDataClient().get(
        `${adminDataSchemaPath(tenantId)}?${xiansParams.toString()}`
      );

      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error, 'data schema GET', {
        fallbackMessage: 'Failed to fetch data schema',
      });
    }
  }
);
