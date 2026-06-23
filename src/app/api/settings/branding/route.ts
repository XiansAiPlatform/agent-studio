import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/settings/branding
 * Returns the current tenant's branding (theme + logo metadata).
 * Tenant is resolved from the httpOnly cookie. TenantAdmin (or system admin) only.
 *
 * The backend rewrites a base64 logo to a URL (clearing the payload), so we only
 * surface logo presence + dimensions here. The image itself is loaded via the
 * same-origin proxy at /api/tenants/{tenantId}/logo.
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const tenant = await client.get<{
        theme?: string | null
        logo?: { url?: string | null; width?: number; height?: number } | null
      }>(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`, {
        headers: { 'X-Tenant-Id': tenantId },
      })

      const logo = tenant.logo
        ? {
            width: tenant.logo.width ?? null,
            height: tenant.logo.height ?? null,
          }
        : null

      return NextResponse.json({ theme: tenant.theme ?? null, logo })
    } catch (error) {
      return handleApiError(error, 'settings/branding GET', {
        fallbackMessage: 'Failed to load branding',
      })
    }
  }
)
