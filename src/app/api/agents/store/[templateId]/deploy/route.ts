import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError, validationError } from '@/lib/api/error-handler'
import { requireSystemAdmin } from '@/lib/api/auth'

/**
 * POST /api/agents/store/{templateId}/deploy
 * Deploy an agent template to the current tenant
 * Requires system administrator access
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    // Verify user is authenticated and is a system admin
    const session = await getServerSession(authOptions)
    const authError = await requireSystemAdmin(session)
    if (authError) return authError

    // Get tenantId from request body or query params
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const tenantId = body.tenantId || searchParams.get('tenantId')

    if (!tenantId) {
      return validationError('tenantId is required')
    }

    // Await params in Next.js 15+
    const { templateId } = await params

    console.log('[Deploy Template API] Deploying template:', templateId, 'to tenant:', tenantId)

    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any)?.accessToken)

    // Deploy the template
    const result = await xians.agents.deployAgentTemplate(templateId, tenantId)

    console.log('[Deploy Template API] Deployment successful:', result)

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, 'Deploy Template')
  }
}
