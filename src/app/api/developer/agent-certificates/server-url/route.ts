import { NextRequest, NextResponse } from 'next/server'
import { withDeveloperAccess } from '@/lib/api/with-tenant'

/**
 * GET /api/developer/agent-certificates/server-url
 * Returns the Xians server URL agents should connect to. Paired with an agent
 * certificate, this is one of the two settings agents need to authenticate.
 */
export const GET = withDeveloperAccess(async (_request: NextRequest) => {
  const serverUrl = process.env.XIANS_SERVER_URL ?? null
  return NextResponse.json({ serverUrl })
})
