import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { handleApiError } from '@/lib/api/error-handler'
import { createXiansClient } from '@/lib/xians/client'

type DeliveriesParams = { integrationId: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LIMIT = 200

function deliveriesPath(tenantId: string, integrationId: string) {
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/webhooks/${integrationId}/incomings`
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

/**
 * Builds the backend query from ?limit=&afterReceivedAt=&afterId=.
 * Returns an error response when a value is malformed.
 */
function listQuery(searchParams: URLSearchParams): URLSearchParams | NextResponse {
  const query = new URLSearchParams()

  const limit = searchParams.get('limit')
  if (limit !== null) {
    const value = Number(limit)
    if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
      return badRequest(`limit must be a whole number between 1 and ${MAX_LIMIT}`)
    }
    query.set('limit', String(value))
  }

  const afterReceivedAt = searchParams.get('afterReceivedAt')
  const afterId = searchParams.get('afterId')
  if ((afterReceivedAt === null) !== (afterId === null)) {
    return badRequest('afterReceivedAt and afterId must be passed together')
  }
  if (afterReceivedAt !== null && afterId !== null) {
    if (Number.isNaN(Date.parse(afterReceivedAt))) return badRequest('afterReceivedAt must be a date')
    if (!UUID_PATTERN.test(afterId)) return badRequest('afterId must be a delivery id')
    query.set('afterReceivedAt', afterReceivedAt)
    query.set('afterId', afterId)
  }

  return query
}

/**
 * GET /api/integrations/{integrationId}/deliveries?limit=&afterReceivedAt=&afterId=
 * Lists the calls a builtin webhook received, newest first. Tenant is injected from session.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext, params }: ApiContext<DeliveriesParams>) => {
    const integrationId = encodeSafePathSegment(params.integrationId)
    if (!integrationId) return badRequest('integrationId is required and must be a valid identifier')

    const query = listQuery(new URL(request.url).searchParams)
    if (query instanceof NextResponse) return query

    try {
      const path = deliveriesPath(tenantContext.tenant.id, integrationId)
      const suffix = query.toString()
      const data = await createXiansClient().get<unknown>(suffix ? `${path}?${suffix}` : path)
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'webhook deliveries GET', {
        fallbackMessage: 'Failed to load deliveries',
      })
    }
  }
)

/**
 * DELETE /api/integrations/{integrationId}/deliveries
 * Deletes every recorded call of a builtin webhook. Tenant is injected from session.
 */
export const DELETE = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<DeliveriesParams>) => {
    const integrationId = encodeSafePathSegment(params.integrationId)
    if (!integrationId) return badRequest('integrationId is required and must be a valid identifier')

    try {
      const data = await createXiansClient().delete<{ deletedCount?: number }>(
        deliveriesPath(tenantContext.tenant.id, integrationId)
      )
      return NextResponse.json({ deletedCount: data?.deletedCount ?? 0 })
    } catch (error) {
      return handleApiError(error, 'webhook deliveries DELETE', {
        fallbackMessage: 'Failed to delete deliveries',
      })
    }
  }
)
