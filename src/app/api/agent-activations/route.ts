import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansSDK } from '@/lib/xians'

/**
 * GET /api/agent-activations
 * List agent activations. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const page = searchParams.get('page')
      const pageSize = searchParams.get('pageSize')
      const agentName = searchParams.get('agentName')
      const status = searchParams.get('status')

      const xians = createXiansSDK((session as any).accessToken)
      const response = await xians.agents.listActivations(tenantContext.tenant.id, {
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
        agentName: agentName || undefined,
        status: status || undefined,
      })

      return NextResponse.json(response)
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activations', message: error.message },
        { status: error.status || 500 }
      )
    }
  }
)

/**
 * POST /api/agent-activations
 * Create a new agent activation. Tenant is injected from session.
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const data = await request.json()

      if (!data.name || !data.agentName) {
        return NextResponse.json(
          { error: 'Validation failed', message: 'name and agentName are required fields' },
          { status: 400 }
        )
      }

      const participantId = (session as any)?.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      const xians = createXiansSDK((session as any).accessToken)
      const activation = await xians.agents.createActivation(tenantContext.tenant.id, {
        ...data,
        participantId,
      })

      return NextResponse.json(activation, { status: 201 })
    } catch (error: any) {
      console.error('[Activations API] Error:', error)
      return NextResponse.json(
        { error: 'Failed to create activation', message: error.message },
        { status: error.status || 500 }
      )
    }
  }
)
