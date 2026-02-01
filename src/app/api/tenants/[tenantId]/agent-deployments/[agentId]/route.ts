import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { useTenantProvider } from '@/lib/tenant'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError, unauthorizedError, validationError, forbiddenError } from '@/lib/api/error-handler'

/**
 * DELETE /api/tenants/{tenantId}/agent-deployments/{agentId}
 * Delete a deployed agent
 * Note: agentId in the URL is actually the agent name
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; agentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return unauthorizedError()
    }

    // Await params in Next.js 15+
    const { tenantId, agentId } = await params
    
    if (!agentId) {
      return validationError('Agent name is required')
    }

    // Validate tenant access
    const tenantProvider = useTenantProvider()
    const tenantContext = await tenantProvider.getTenantContext(
      (session as any)?.user?.id,
      tenantId,
      (session as any)?.accessToken
    )
    
    if (!tenantContext) {
      return forbiddenError('Access denied to this tenant')
    }

    console.log('[Delete Agent Deployment API] Deleting agent:', agentId, 'from tenant:', tenantId)

    // Create SDK instance with user's auth token
    const xians = createXiansSDK((session as any)?.accessToken)

    // Delete the agent deployment (agentId is actually the agent name)
    await xians.agents.deleteAgentDeployment(tenantId, agentId)

    console.log('[Delete Agent Deployment API] Agent deleted successfully')

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return handleApiError(error, 'Delete Agent Deployment')
  }
}
