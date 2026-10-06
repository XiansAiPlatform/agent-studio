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
 * Number of active agent activations in a tenant. Shown in the disable-tenant warning, since
 * disabling deactivates all of them and re-enabling does not bring them back.
 * System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = extractTenantId(request.nextUrl.pathname)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    // The AdminApi returns the full list as a plain array; tolerate a paginated shape too.
    const response = await client.get<
      XiansAgentActivation[] | { items?: XiansAgentActivation[]; data?: XiansAgentActivation[] }
    >(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agentActivations`)
    const activations = Array.isArray(response)
      ? response
      : response?.items ?? response?.data ?? []
    const activeCount = activations.filter((a) => a.isActive).length
    return NextResponse.json({ activeCount })
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants/[tenantId]/active-agents GET', {
      fallbackMessage: 'Failed to fetch active agents',
    })
  }
})
