import { NextRequest } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'

/**
 * GET /api/messaging/listen
 * SSE stream for real-time messages. Tenant is injected from session (httpOnly cookie).
 */
export async function GET(request: NextRequest) {
  const handler = withTenantFromSession(
    async (req: NextRequest, { tenantContext, session }: ApiContext) => {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(req.url)

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const heartbeatSeconds = searchParams.get('heartbeatSeconds') || '60'

      const participantId = session.user?.email
      if (!participantId) {
        return new Response(
          JSON.stringify({ error: 'User email not found in session' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (!agentName || !activationName) {
        return new Response(
          JSON.stringify({ error: 'agentName and activationName are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const xiansBaseUrl = process.env.XIANS_SERVER_URL?.replace(/\/$/, '')
      const xiansApiKey = process.env.XIANS_APIKEY

      if (!xiansBaseUrl || !xiansApiKey) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        participantId,
        heartbeatSeconds,
      })

      const xiansUrl = `${xiansBaseUrl}/api/v1/admin/tenants/${tenantId}/messaging/listen?${queryParams.toString()}`

      const xiansResponse = await fetch(xiansUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${xiansApiKey}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })

      if (!xiansResponse.ok) {
        return new Response(
          JSON.stringify({
            error: `Failed to connect to message stream: ${xiansResponse.statusText}`,
          }),
          {
            status: xiansResponse.status,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (!xiansResponse.body) {
        return new Response(
          JSON.stringify({ error: 'No response body from server' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(xiansResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }
  )
  return handler(request)
}
