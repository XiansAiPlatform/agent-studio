import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin } from '@/lib/api/with-tenant'

/**
 * GET /api/developer/agent-certificates/server-url
 * Returns the Xians server URL agents should connect to. Paired with an agent
 * certificate, this is one of the two settings agents need to authenticate.
 */
export const GET = withParticipantAdmin(async (_request: NextRequest) => {
  const serverUrl = process.env.XIANS_SERVER_URL ?? null
  return NextResponse.json({ serverUrl })
})
