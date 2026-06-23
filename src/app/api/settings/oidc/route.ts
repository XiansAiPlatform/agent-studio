import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/settings/oidc
 * Returns the current tenant's OIDC token-acceptance configuration, or null when
 * none is configured. Tenant is resolved from the httpOnly cookie. TenantAdmin
 * (or system admin) only.
 *
 * The configuration governs which external OIDC providers are accepted when
 * authenticating UserApi requests for this tenant.
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const config = await client.get<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/oidc-config`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ config: config ?? null })
    } catch (error) {
      return handleApiError(error, 'settings/oidc GET', {
        fallbackMessage: 'Failed to load OIDC configuration',
      })
    }
  }
)

/**
 * PUT /api/settings/oidc
 * Create or replace the current tenant's OIDC configuration.
 * TenantAdmin (or system admin) only; tenant resolved from the httpOnly cookie.
 *
 * Body: a JSON object describing the OIDC rules. Any `tenantId` field is
 * stripped here because the backend authoritatively scopes the configuration to
 * the route tenant (and the cookie-only tenant guard rejects client-supplied
 * tenant identity).
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

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'The OIDC configuration must be a JSON object' },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      const headers = { 'X-Tenant-Id': tenantId }
      // The upsert response is just a success flag, so re-read the stored config
      // to return its canonical form (including the backend-managed tenantId).
      await client.put<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/oidc-config`,
        body,
        { headers }
      )
      const stored = await client.get<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/oidc-config`,
        { headers }
      )
      return NextResponse.json({ config: stored ?? body })
    } catch (error) {
      return handleApiError(error, 'settings/oidc PUT', {
        fallbackMessage: 'Failed to save OIDC configuration',
      })
    }
  }
)

/**
 * DELETE /api/settings/oidc
 * Remove the current tenant's OIDC configuration.
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/oidc-config`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/oidc DELETE', {
        fallbackMessage: 'Failed to delete OIDC configuration',
      })
    }
  }
)
