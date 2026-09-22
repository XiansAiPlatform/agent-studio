import { NextRequest, NextResponse } from 'next/server';
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant';
import { handleApiError, validationError } from '@/lib/api/error-handler';
import { isSafePathSegment } from '@/lib/api/path-segment';
import {
  ADMIN_DATA_JSON_MAX_BYTES,
  adminDataRecordPath,
  createAdminDataClient,
  isIsoDateTime,
  isPlainObject,
  jsonExceedsByteLimit,
  loadRecordIfEditable,
  oversizedRequestError,
} from '@/lib/xians/admin-data';

async function recordIdFrom(
  context: { params: Promise<{ recordId: string }> }
): Promise<string | null> {
  const { recordId } = await context.params;
  const trimmed = recordId?.trim();
  // Reject traversal / encoded separators; adminDataRecordPath encodes the rest.
  return isSafePathSegment(trimmed) ? trimmed : null;
}

/**
 * GET /api/data/[recordId]
 * Fetch a single data record. Owning agent is loaded from AdminAPI, then gated.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ recordId: string }> }
) {
  const handler = withParticipantAdmin(
    async (_req: NextRequest, { session, tenantId }: ApiContext) => {
      const recordId = await recordIdFrom(context);
      if (!recordId) {
        return validationError('Record ID is required and must be a valid identifier');
      }

      try {
        const client = createAdminDataClient();
        const [item, denied] = await loadRecordIfEditable(
          client,
          session,
          tenantId,
          recordId
        );
        if (denied) return denied;
        return NextResponse.json(item);
      } catch (error) {
        return handleApiError(error, 'data GET by id', {
          fallbackMessage: 'Failed to fetch record',
        });
      }
    }
  );
  return handler(request);
}

/**
 * PUT /api/data/[recordId]
 * Partial update. Identity fields (id, tenantId, agentName, activationName,
 * dataType, createdAt, createdBy) are never forwarded — treating them as
 * immutable keeps records in the activation/type views that list and bulk
 * delete use, and keeps duplicate-key checks (dataType + key) stable.
 * Missing / cross-tenant records are 404.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ recordId: string }> }
) {
  const handler = withParticipantAdmin(
    async (req: NextRequest, { session, tenantId }: ApiContext) => {
      const recordId = await recordIdFrom(context);
      if (!recordId) {
        return validationError('Record ID is required and must be a valid identifier');
      }

      try {
        const tooLarge = oversizedRequestError(req);
        if (tooLarge) return tooLarge;

        let body: Record<string, unknown>;
        try {
          body = await req.json();
        } catch {
          return validationError('Invalid JSON body');
        }

        if (!isPlainObject(body)) {
          return validationError('Request body must be a JSON object');
        }

        const client = createAdminDataClient();
        const [, denied] = await loadRecordIfEditable(
          client,
          session,
          tenantId,
          recordId
        );
        if (denied) return denied;

        const payload: Record<string, unknown> = {};

        if (body.key !== undefined) {
          if (typeof body.key !== 'string' || !body.key.trim()) {
            return validationError('key must be a non-empty string');
          }
          payload.key = body.key.trim();
        }

        if (body.content !== undefined) {
          if (!isPlainObject(body.content)) {
            return validationError('content must be a JSON object');
          }
          if (jsonExceedsByteLimit(body.content)) {
            return validationError(
              `content must be at most ${ADMIN_DATA_JSON_MAX_BYTES} bytes`
            );
          }
          payload.content = body.content;
        }

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

        if (body.participantId !== undefined) {
          if (body.participantId !== null && typeof body.participantId !== 'string') {
            return validationError('participantId must be a string');
          }
          payload.participantId =
            typeof body.participantId === 'string'
              ? body.participantId.trim()
              : body.participantId;
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

        if (Object.keys(payload).length === 0) {
          return validationError('No updatable fields were provided');
        }

        const response = await client.put(adminDataRecordPath(tenantId, recordId), payload);
        return NextResponse.json(response);
      } catch (error) {
        return handleApiError(error, 'data PUT', {
          fallbackMessage: 'Failed to update record',
        });
      }
    }
  );
  return handler(request);
}

/**
 * DELETE /api/data/[recordId]
 * Delete a single data record. Owning agent is loaded from AdminAPI, then gated.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ recordId: string }> }
) {
  const handler = withParticipantAdmin(
    async (_req: NextRequest, { session, tenantId }: ApiContext) => {
      const recordId = await recordIdFrom(context);
      if (!recordId) {
        return validationError('Record ID is required and must be a valid identifier');
      }

      try {
        const client = createAdminDataClient();
        const [, denied] = await loadRecordIfEditable(
          client,
          session,
          tenantId,
          recordId
        );
        if (denied) return denied;

        const response = await client.delete(adminDataRecordPath(tenantId, recordId));
        return NextResponse.json(response);
      } catch (error) {
        return handleApiError(error, 'data DELETE by id', {
          fallbackMessage: 'Failed to delete record',
        });
      }
    }
  );
  return handler(request);
}
