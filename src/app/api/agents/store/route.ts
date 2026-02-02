import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'
import { requireSystemAdmin } from '@/lib/api/auth'

/**
 * GET /api/agents/store
 * Fetch Available Agents from Xians server
 * Requires system administrator access
 * No tenant ID required - SystemScoped agents
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated and is a system admin
    const session = await getServerSession(authOptions)
    const authError = await requireSystemAdmin(session)
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
