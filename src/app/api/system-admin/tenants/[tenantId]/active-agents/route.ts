import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { XiansAgentActivation } from '@/lib/xians/types'

/**
 * Extract tenantId from the URL path: /api/system-admin/tenants/{tenantId}/active-agents
 */
function extractTenantId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/tenants\/([^/]+)\/active-agents$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /api/system-admin/tenants/[tenantId]/active-agents
 * Count the tenant's active agent activations — the agents that disabling the tenant will
 * deactivate. System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = extractTenantId(request.nextUrl.pathname)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    // The upstream returns every activation of the tenant as a plain array.
    const activations = await client.get<XiansAgentActivation[]>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations`
    )
    const count = (activations ?? []).filter((a) => a.isActive).length
    return NextResponse.json({ count })
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants/[tenantId]/active-agents GET', {
      fallbackMessage: 'Failed to count active agents',
    })
  }
})
