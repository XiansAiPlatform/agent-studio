import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/audit-log/filter-options
 * Distinct "performed by", action and activation-name values for the filter dropdowns,
 * fetched in one request (one authorization pass instead of three).
 * Restricted to tenant admins (and system admins).
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const base = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/audit-logs`

      // A failing list must not break the others: the dropdown just stays empty.
      const [performedBy, actions, activationNames] = await Promise.allSettled([
        xiansClient.get<string[]>(`${base}/performed-by`),
        xiansClient.get<string[]>(`${base}/actions`),
        xiansClient.get<string[]>(`${base}/activation-names`),
      ])

      const toList = (r: PromiseSettledResult<string[]>): string[] =>
        r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []

      return NextResponse.json({
        performedBy: toList(performedBy),
        actions: toList(actions),
        activationNames: toList(activationNames),
      })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
