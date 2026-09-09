import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/audit-log
 * Paginated, filterable list of audit log entries for the current tenant (newest first).
 * Restricted to tenant admins (and system admins).
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { session, tenantId }: ApiContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const upstream = new URLSearchParams()

      const performedBy = searchParams.get('performedBy')
      const activationName = searchParams.get('activationName')
      const onlyWithoutActivation = searchParams.get('onlyWithoutActivation')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (performedBy) upstream.set('performedBy', performedBy)
      if (onlyWithoutActivation === 'true') {
        upstream.set('onlyWithoutActivation', 'true')
      } else if (activationName) {
        upstream.set('activationName', activationName)
      }
      if (startDate) upstream.set('startDate', startDate)
      if (endDate) upstream.set('endDate', endDate)
      upstream.set('page', searchParams.get('page') || '1')
      upstream.set('pageSize', searchParams.get('pageSize') || '20')

      const xiansClient = createXiansClient((session as { accessToken?: string })?.accessToken)
      const path = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/audit-logs?${upstream.toString()}`
      const response = await xiansClient.get(path)

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
