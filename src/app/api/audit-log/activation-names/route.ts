import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/audit-log/activation-names
 * Distinct activation names recorded for the tenant, for a filter dropdown.
 * Restricted to tenant admins (and system admins).
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/audit-logs/activation-names`
      const response = await xiansClient.get(path)

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
