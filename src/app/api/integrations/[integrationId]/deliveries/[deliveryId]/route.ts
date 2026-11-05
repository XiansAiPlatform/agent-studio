import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { handleApiError } from '@/lib/api/error-handler'
import { createXiansClient } from '@/lib/xians/client'

type DeliveryParams = { integrationId: string; deliveryId: string }

/** Returns the backend path for one delivery, or an error response for unsafe ids. */
function deliveryPath(tenantId: string, params: DeliveryParams): string | NextResponse {
  const integrationId = encodeSafePathSegment(params.integrationId)
  const deliveryId = encodeSafePathSegment(params.deliveryId)
  if (!integrationId || !deliveryId) {
    return NextResponse.json(
      { error: 'integrationId and deliveryId are required and must be valid identifiers' },
      { status: 400 }
    )
  }
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/webhooks/${integrationId}/incomings/${deliveryId}`
}

/**
 * GET /api/integrations/{integrationId}/deliveries/{deliveryId}
 * One recorded call with its headers and payload. Credential header values come back masked.
 */
export const GET = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<DeliveryParams>) => {
    const path = deliveryPath(tenantContext.tenant.id, params)
    if (path instanceof NextResponse) return path

    try {
      const data = await createXiansClient().get<unknown>(path)
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'webhook delivery GET', {
        fallbackMessage: 'Failed to load delivery',
      })
    }
  }
)

/**
 * DELETE /api/integrations/{integrationId}/deliveries/{deliveryId}
 * Deletes one recorded call.
 */
export const DELETE = withParticipantAdmin(
  async (_req: NextRequest, { tenantContext, params }: ApiContext<DeliveryParams>) => {
    const path = deliveryPath(tenantContext.tenant.id, params)
    if (path instanceof NextResponse) return path

    try {
      await createXiansClient().delete<unknown>(path)
      return NextResponse.json({ success: true })
    } catch (error) {
      return handleApiError(error, 'webhook delivery DELETE', {
        fallbackMessage: 'Failed to delete delivery',
      })
    }
  }
)
