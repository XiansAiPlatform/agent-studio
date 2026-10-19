import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { parseBrandingImage } from '@/lib/tenant/branding-image'
import { invalidateTenantImage } from '@/lib/tenant/image-proxy'

/**
 * PUT /api/settings/branding/logo
 * Set (create or replace) the current tenant's logo. Accepts either an external
 * image URL or a base64-encoded image, plus its width/height (both required by
 * the backend Logo model). TenantAdmin (or system admin) only.
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

    const { image: logo, error } = parseBrandingImage(body, 'Logo')
    if (error !== undefined) {
      return NextResponse.json({ error }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      await client.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/logo`,
        logo,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      invalidateTenantImage('logo', tenantId)
      return NextResponse.json({ width: logo.width, height: logo.height })
    } catch (error) {
      return handleApiError(error, 'settings/branding/logo PUT', {
        fallbackMessage: 'Failed to update logo',
      })
    }
  }
)

/**
 * DELETE /api/settings/branding/logo
 * Remove the current tenant's logo.
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/logo`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      invalidateTenantImage('logo', tenantId)
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/branding/logo DELETE', {
        fallbackMessage: 'Failed to remove logo',
      })
    }
  }
)
