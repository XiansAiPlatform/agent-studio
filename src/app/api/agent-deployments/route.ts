import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { XiansAgentDeployment } from '@/lib/xians/types'
import { xiansAdminHeaders } from '@/lib/xians/client'

/**
 * GET /api/agent-deployments
 * Fetch deployed agents for the current tenant.
 * Tenant is injected from session (httpOnly cookie), never from frontend.
 * Calls backend with explicit page/pageSize params to ensure all agents are returned.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const baseUrl = process.env.XIANS_SERVER_URL?.replace(/\/$/, '') ?? ''
      const tenantId = tenantContext.tenant.id
      const allAgents: XiansAgentDeployment[] = []
      let page = 1
      const pageSize = 100
      let hasNext = true

      while (hasNext) {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
        const url = `${baseUrl}/api/v1/admin/tenants/${tenantId}/agentDeployments?${params.toString()}`
        const res = await fetch(url, {
          method: 'GET',
          headers: xiansAdminHeaders({ 'Content-Type': 'application/json' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message ?? err.error ?? `Backend returned ${res.status}`)
        }
        const data = await res.json()
        const agents = data?.agents ?? []
        allAgents.push(...agents)
        hasNext = data?.pagination?.hasNext ?? false
        page++
      }

      console.log('[Agent Deployments API] Agents count:', allAgents.length)

      return NextResponse.json({
        agents: allAgents,
        pagination: {
          page: 1,
          pageSize: allAgents.length,
          totalPages: 1,
          totalItems: allAgents.length,
          hasNext: false,
          hasPrevious: false,
        },
      })
    } catch (error: any) {
      console.error('Error fetching agent deployments:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch agent deployments',
          message: error.message,
        },
        { status: error.status || 500 }
      )
    }
  }
)
