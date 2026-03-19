import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'
import { requireParticipantAdmin } from '@/lib/api/auth'
import { getTenantIdFromCookie } from '@/lib/api/with-tenant'

/**
 * GET /api/agents/store
 * Fetch Available Agents from Xians server
 * Requires TenantParticipantAdmin or system administrator access
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const tenantId = getTenantIdFromCookie(request)
    const authError = await requireParticipantAdmin(session, tenantId)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const basicDataOnly = searchParams.get('basicDataOnly') === 'true'

    // Create SDK instance with user's auth token
    const sdk = createXiansSDK((session as any)?.accessToken)

    // Fetch Available Agents
    const templates = await sdk.agents.listAgentTemplates({
      basicDataOnly,
    })

    return NextResponse.json(templates)
  } catch (error: any) {
    return handleApiError(error, 'Fetch Agent Templates')
  }
}
