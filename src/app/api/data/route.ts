import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { assertCanEditAgent } from '@/lib/auth/agent-access';
import { handleApiError, validationError } from '@/lib/api/error-handler';
import {
  ADMIN_DATA_JSON_MAX_BYTES,
  adminDataCollectionPath,
  assertActivationOwnedByAgent,
  createAdminDataClient,
  isIsoDateTime,
  isPlainObject,
  jsonExceedsByteLimit,
  oversizedRequestError,
} from '@/lib/xians/admin-data';

function trimRequired(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * GET /api/data
 * Fetch data records for an agent, activation, and data type.
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
      const dataType = searchParams.get('dataType');
      const skip = searchParams.get('skip') || '0';
      const limit = searchParams.get('limit') || '100';

      if (!startDate || !endDate || !agentName || !dataType) {
        return validationError(
          'Missing required parameters: startDate, endDate, agentName, dataType'
        );
      }

      const denied = await assertCanEditAgent(session, tenantId, agentName);
      if (denied) return denied;

      const skipNum = parseInt(skip, 10);
      const limitNum = parseInt(limit, 10);

      if (isNaN(skipNum) || skipNum < 0) {
        return validationError('Invalid skip parameter. Must be a non-negative integer.');
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return validationError('Invalid limit parameter. Must be between 1 and 1000.');
      }

      const xiansParams = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        dataType,
        skip: skipNum.toString(),
        limit: limitNum.toString(),
      });

      if (activationName) {
        xiansParams.set('activationName', activationName);
      }

      const response = await createAdminDataClient().get(
        `${adminDataCollectionPath(tenantId)}?${xiansParams.toString()}`
      );

      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error, 'data GET', {
        fallbackMessage: 'Failed to fetch data records',
      });
    }
  }
);

/**
 * POST /api/data
 * Create a data record. Tenant is stamped server-side; body tenantId is rejected
 * by withParticipantAdmin. Duplicate dataType + key returns 409 from AdminAPI.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const tooLarge = oversizedRequestError(request);
      if (tooLarge) return tooLarge;

      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return validationError('Invalid JSON body');
      }

      if (!isPlainObject(body)) {
        return validationError('Request body must be a JSON object');
      }

      const agentName = trimRequired(body.agentName);
      const dataType = trimRequired(body.dataType);
      const key = trimRequired(body.key);
      const activationName = trimRequired(body.activationName);

      if (!agentName || !dataType || !key || !activationName) {
        return validationError(
          'agentName, dataType, key, and activationName are required'
        );
      }

      if (body.content === undefined) {
        return validationError('content is required');
      }

      if (!isPlainObject(body.content)) {
        return validationError('content must be a JSON object');
      }

      if (jsonExceedsByteLimit(body.content)) {
        return validationError(
          `content must be at most ${ADMIN_DATA_JSON_MAX_BYTES} bytes`
        );
      }

      const denied = await assertCanEditAgent(session, tenantId, agentName);
      if (denied) return denied;

      const client = createAdminDataClient();
      const activationDenied = await assertActivationOwnedByAgent(
        client,
        tenantId,
        agentName,
        activationName
      );
      if (activationDenied) return activationDenied;

      const payload: Record<string, unknown> = {
        agentName,
        dataType,
        key,
        content: body.content,
        activationName,
      };

      const participantId = trimOptional(body.participantId);
      if (participantId) payload.participantId = participantId;

      if (body.metadata !== undefined) {
        if (body.metadata !== null && !isPlainObject(body.metadata)) {
          return validationError('metadata must be a JSON object');
        }
        if (body.metadata !== null && jsonExceedsByteLimit(body.metadata)) {
          return validationError(
            `metadata must be at most ${ADMIN_DATA_JSON_MAX_BYTES} bytes`
          );
        }
        payload.metadata = body.metadata;
      }

      if (body.expiresAt !== undefined) {
        if (body.expiresAt !== null && typeof body.expiresAt !== 'string') {
          return validationError('expiresAt must be an ISO date-time string');
        }
        if (typeof body.expiresAt === 'string' && !isIsoDateTime(body.expiresAt)) {
          return validationError('expiresAt must be an ISO date-time string');
        }
        payload.expiresAt = body.expiresAt;
      }

      const response = await client.post(adminDataCollectionPath(tenantId), payload);

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return handleApiError(error, 'data POST', {
        fallbackMessage: 'Failed to create data record',
      });
    }
  }
);

/**
 * DELETE /api/data
 * Delete all data for a given data type.
 * Tenant is resolved from server-side session (httpOnly cookie), never from client.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url);

      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const agentName = searchParams.get('agentName');
      const dataType = searchParams.get('dataType');
      const activationName = searchParams.get('activationName');

      if (!startDate || !endDate || !agentName || !dataType) {
        return validationError(
          'Missing required parameters: startDate, endDate, agentName, dataType'
        );
      }

      const denied = await assertCanEditAgent(session, tenantId, agentName);
      if (denied) return denied;

      const xiansParams = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        dataType,
      });

      if (activationName) {
        xiansParams.set('activationName', activationName);
      }

      const response = await createAdminDataClient().delete(
        `${adminDataCollectionPath(tenantId)}?${xiansParams.toString()}`
      );

      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error, 'data DELETE', {
        fallbackMessage: 'Failed to delete data',
      });
    }
  }
);
