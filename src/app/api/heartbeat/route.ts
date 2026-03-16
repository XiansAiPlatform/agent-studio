import { NextRequest } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/heartbeat
 * Agent worker liveness check for a specific activation.
 * Proxies to Xians AdminApi heartbeat endpoint which signals the Temporal workflow
 * and waits for a response to verify workers are available.
 *
 * Query params: agentName, activationName, timeoutSeconds (optional, 1-30, default: 10)
 * Response: { available: boolean }
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const timeoutSeconds = searchParams.get('timeoutSeconds') || '10'

      if (!agentName || !activationName) {
        return Response.json(
          { error: 'agentName and activationName are required' },
          { status: 400 }
        )
      }

      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        timeoutSeconds,
      })

      const client = createXiansClient()
      const result = await client.get<{ available: boolean }>(
        `/api/v1/admin/tenants/${tenantId}/heartbeat?${queryParams.toString()}`
      )

      return Response.json(result ?? { available: false })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
