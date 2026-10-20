import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

interface TenantImage {
  url?: string | null
  width?: number
  height?: number
}

function toImageMeta(image: TenantImage | null | undefined) {
  return image ? { width: image.width ?? null, height: image.height ?? null } : null
}

/**
 * GET /api/settings/branding
 * Returns the current tenant's branding: the theme, and whether a logo and a
 * favicon are set (with their sizes). The tenant comes from the login cookie.
 * Only tenant admins and system admins can use it.
 *
 * The images themselves are not included. The page loads them from
 * /api/tenants/{tenantId}/logo and /api/tenants/{tenantId}/favicon.
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const tenant = await client.get<{
        theme?: string | null
        logo?: TenantImage | null
        favicon?: TenantImage | null
      }>(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`, {
        headers: { 'X-Tenant-Id': tenantId },
      })

      return NextResponse.json({
        theme: tenant.theme ?? null,
        logo: toImageMeta(tenant.logo),
        favicon: toImageMeta(tenant.favicon),
      })
    } catch (error) {
      return handleApiError(error, 'settings/branding GET', {
        fallbackMessage: 'Failed to load branding',
      })
    }
  }
)
