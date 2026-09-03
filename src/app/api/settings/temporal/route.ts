import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdminTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TemporalConfig, TemporalConfigStatus } from '@/app/(dashboard)/tenant-settings/temporal/types'

/**
 * GET /api/settings/temporal
 * Returns whether the current tenant has a dedicated Temporal connection, and
 * its fields when it does. System administrators only.
 */
export const GET = withSystemAdminTenant(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const status = await client.get<TemporalConfigStatus>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/temporal-config`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(status)
    } catch (error) {
      return handleApiError(error, 'settings/temporal GET', {
        fallbackMessage: 'Failed to load Temporal configuration',
      })
    }
  }
)

/**
 * PUT /api/settings/temporal
 * Create or replace the current tenant's Temporal connection override.
 * System administrators only; tenant resolved from the httpOnly cookie.
 */
export const PUT = withSystemAdminTenant(
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
        { error: 'The Temporal configuration must be a JSON object' },
        { status: 400 }
      )
    }

    const { serverUrl, namespace, certificate, privateKey } = body as Partial<TemporalConfig>

    if (typeof serverUrl !== 'string' || !serverUrl.trim() || typeof namespace !== 'string' || !namespace.trim()) {
      return NextResponse.json(
        { error: 'serverUrl and namespace are required' },
        { status: 400 }
      )
    }

    if (Boolean(certificate) !== Boolean(privateKey)) {
      return NextResponse.json(
        { error: 'certificate and privateKey must be provided together' },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      await client.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/temporal-config`,
        {
          // tenantId is a required field on the backend's request DTO, though the handler
          // itself ignores it and always scopes the write to the route tenant.
          tenantId,
          serverUrl: serverUrl.trim(),
          namespace: namespace.trim(),
          certificate: certificate || undefined,
          privateKey: privateKey || undefined,
        },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      const status = await client.get<TemporalConfigStatus>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/temporal-config`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(status)
    } catch (error) {
      return handleApiError(error, 'settings/temporal PUT', {
        fallbackMessage: 'Failed to save Temporal configuration',
      })
    }
  }
)

/**
 * DELETE /api/settings/temporal
 * Reverts the current tenant to the default Temporal server. The backend
 * keeps the row (flagged as reverted) rather than deleting it, via
 * POST /temporal-config/revert. System administrators only.
 */
export const DELETE = withSystemAdminTenant(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/temporal-config/revert`,
        // The backend's revert handler binds this body's type but ignores its contents;
        // tenantId/serverUrl/namespace are only present to satisfy required-field deserialization.
        { tenantId, serverUrl: '', namespace: '' },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/temporal DELETE', {
        fallbackMessage: 'Failed to revert to the default Temporal configuration',
      })
    }
  }
)
