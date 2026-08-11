import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdminTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/settings/oidc/template
 * Returns a sample OIDC configuration (with the current tenant's id filled in)
 * that system admins can use as a starting point. System administrators only.
 */
export const GET = withSystemAdminTenant(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const template = await client.get<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/oidc-config/template`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ config: template ?? null })
    } catch (error) {
      return handleApiError(error, 'settings/oidc/template GET', {
        fallbackMessage: 'Failed to load OIDC configuration template',
      })
    }
  }
)
