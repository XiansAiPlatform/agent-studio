import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * PUT /api/settings/branding/theme
 * Set (create or replace) the current tenant's theme.
 * TenantAdmin (or system admin) only; tenant resolved from the httpOnly cookie.
 *
 * Body: { theme: string }
 */
export const PUT = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: { theme?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (typeof body.theme !== 'string' || body.theme.trim() === '') {
      return NextResponse.json(
        { error: 'theme must be a non-empty string' },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      await client.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/theme`,
        { theme: body.theme.trim() },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ theme: body.theme.trim() })
    } catch (error) {
      return handleApiError(error, 'settings/branding/theme PUT', {
        fallbackMessage: 'Failed to update theme',
      })
    }
  }
)

/**
 * DELETE /api/settings/branding/theme
 * Clear the current tenant's theme (revert to the application default).
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/theme`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/branding/theme DELETE', {
        fallbackMessage: 'Failed to clear theme',
      })
    }
  }
)
