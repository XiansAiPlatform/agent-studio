import { NextResponse } from 'next/server'
import { withParticipantAdmin } from '@/lib/api/with-tenant'

/**
 * GET /api/mcp/configuration
 * Returns the tenant-level Xians MCP server URL for MCP clients.
 */
export const GET = withParticipantAdmin(async () => {
  const serverUrl = process.env.XIANS_SERVER_URL?.replace(/\/+$/, '')
  if (!serverUrl) {
    return NextResponse.json({ error: 'Xians server URL is not configured.' }, { status: 503 })
  }

  const url = `${serverUrl}/api/v1/admin/mcp`
  return NextResponse.json({
    mcpServers: [{
      name: 'xians',
      url,
      enabled: true,
      transport: 'streamableHttp',
      context: 'xians',
      authentication: { type: 'bearer', secret: 'XIANS_MCP_KEY' },
    }],
  })
})
