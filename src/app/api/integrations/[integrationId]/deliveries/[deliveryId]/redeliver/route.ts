import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { handleApiError } from '@/lib/api/error-handler'
import { requireCapability } from '@/lib/api/auth'
import { createXiansClient } from '@/lib/xians/client'

type DeliveryParams = { integrationId: string; deliveryId: string }

/**
 * The server waits for the webhook up to its own timeout plus a margin, at most 290 s, so this
 * call must outlast that rather than use the 5 s default. It stays under 300 s, where Node's fetch
 * gives up on a response that has sent no headers.
 */
const REDELIVER_TIMEOUT_MS = 295_000

/**
 * Each redelivery can hold a connection open for up to REDELIVER_TIMEOUT_MS, so one user may only
 * have a few running at once. The count is per server instance; the backend's 409 already stops
 * two at once for the same delivery.
 */
const MAX_REDELIVERIES_PER_USER = 3
const inFlight = new Map<string, number>()

/**
 * POST /api/integrations/{integrationId}/deliveries/{deliveryId}/redeliver
 * Sends a recorded call to its webhook again. The agent runs again, so only users with
 * `webhooks:redeliver` (Developers and above) may do it. The Admin API is called with the shared
 * service key, so this check is the per-user boundary.
 */
export const POST = withParticipantAdmin(
  async (_req: NextRequest, { session, tenantContext, tenantId, params }: ApiContext<DeliveryParams>) => {
    const denied = await requireCapability(
      session,
      tenantId,
      'webhooks:redeliver',
      'Redeliver is available to Developers'
    )
    if (denied) return denied

    const integrationId = encodeSafePathSegment(params.integrationId)
    const deliveryId = encodeSafePathSegment(params.deliveryId)
    if (!integrationId || !deliveryId) {
      return NextResponse.json(
        { error: 'integrationId and deliveryId are required and must be valid identifiers' },
        { status: 400 }
      )
    }

    const userKey = `${tenantId}:${session.user.id ?? session.user.email ?? ''}`
    const running = inFlight.get(userKey) ?? 0
    if (running >= MAX_REDELIVERIES_PER_USER) {
      return NextResponse.json(
        { error: `You already have ${running} redeliveries running. Wait for one to finish.` },
        { status: 429 }
      )
    }
    inFlight.set(userKey, running + 1)

    const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantContext.tenant.id)}/webhooks/${integrationId}/incomings/${deliveryId}/redeliver`
    try {
      // The browser's abort is not passed on on purpose: once sent, the call may already be running
      // the agent, and cutting it off would only lose its result and audit entry.
      const result = await createXiansClient().post<unknown>(path, undefined, { timeoutMs: REDELIVER_TIMEOUT_MS })
      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error, 'webhook delivery redeliver POST', {
        fallbackMessage: 'Failed to redeliver',
      })
    } finally {
      const left = (inFlight.get(userKey) ?? 1) - 1
      if (left > 0) inFlight.set(userKey, left)
      else inFlight.delete(userKey)
    }
  }
)
