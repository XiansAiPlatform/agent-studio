import { NextResponse } from 'next/server'
import { withParticipantAdmin } from '@/lib/api/with-tenant'
import { assertCanEditAgent } from '@/lib/auth/agent-access'

export const GET = withParticipantAdmin(async (request, { session, tenantId }) => {
  const agentName = request.nextUrl.searchParams.get('agentName')
  const activationName = request.nextUrl.searchParams.get('activationName')
  if (!agentName || !activationName) return NextResponse.json({ error: 'Select an agent and activation.' }, { status: 400 })
  const denied = await assertCanEditAgent(session, tenantId, agentName)
  if (denied) return denied
  const serverUrl = process.env.XIANS_SERVER_URL?.replace(/\/+$/, '')
  if (!serverUrl) return NextResponse.json({ error: 'Xians server URL is not configured.' }, { status: 503 })
  const url = `${serverUrl}/api/v1/admin/mcp`
  return NextResponse.json({ mcpServers: [{
    name: 'xians', url, enabled: true, transport: 'streamableHttp', context: 'xians',
    authentication: { type: 'bearer', secret: 'XIANS_MCP_KEY' },
  }] })
})
