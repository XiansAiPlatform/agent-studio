import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { parseBrandingImage } from '@/lib/tenant/branding-image'
import { invalidateTenantImage } from '@/lib/tenant/image-proxy'

/**
 * PUT /api/settings/branding/favicon
 * Saves the current tenant's favicon, replacing any old one. It takes the same
 * body and has the same limits as the logo. Only tenant admins and system
 * admins can use it.
 *
 * Body: { url?: string, imgBase64?: string, width: number, height: number }
 */
export const PUT = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { image: favicon, error } = parseBrandingImage(body, 'Favicon')
    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      await client.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/favicon`,
        favicon,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      invalidateTenantImage('favicon', tenantId)
      return NextResponse.json({ width: favicon.width, height: favicon.height })
    } catch (error) {
      return handleApiError(error, 'settings/branding/favicon PUT', {
        fallbackMessage: 'Failed to update favicon',
      })
    }
  }
)

/**
 * DELETE /api/settings/branding/favicon
 * Removes the current tenant's favicon. After that, the logo is used, or the
 * default icon if there is no logo.
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/favicon`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      invalidateTenantImage('favicon', tenantId)
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/branding/favicon DELETE', {
        fallbackMessage: 'Failed to remove favicon',
      })
    }
  }
)
