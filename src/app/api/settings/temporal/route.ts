import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdminTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TemporalConfig } from '@/app/(dashboard)/tenant-settings/temporal/types'

const METADATA_KEY = 'temporal_config'

interface TenantMetadataEntry {
  key: string
  value: string
  type: 'PlainText' | 'Secret'
}


export const GET = withSystemAdminTenant(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const entry = await client.get<TenantMetadataEntry>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/metadata/${METADATA_KEY}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      const config: TemporalConfig = JSON.parse(entry.value)
      return NextResponse.json({ config })
    } catch (error) {
      if (error instanceof XiansApiError && error.status === 404) {
        return NextResponse.json({ config: null })
      }
      return handleApiError(error, 'settings/temporal GET', {
        fallbackMessage: 'Failed to load Temporal configuration',
      })
    }
  }
)

/**
 * PUT /api/settings/temporal
 * Create or replace the current tenant's Temporal override.
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

    const { serverUrl, namespace, certificateBase64, privateKeyBase64 } = body as Partial<TemporalConfig>

    if (typeof serverUrl !== 'string' || !serverUrl.trim() || typeof namespace !== 'string' || !namespace.trim()) {
      return NextResponse.json(
        { error: 'serverUrl and namespace are required' },
        { status: 400 }
      )
    }

    if (Boolean(certificateBase64) !== Boolean(privateKeyBase64)) {
      return NextResponse.json(
        { error: 'certificateBase64 and privateKeyBase64 must be provided together' },
        { status: 400 }
      )
    }

    const config: TemporalConfig = {
      serverUrl: serverUrl.trim(),
      namespace: namespace.trim(),
      ...(certificateBase64 ? { certificateBase64 } : {}),
      ...(privateKeyBase64 ? { privateKeyBase64 } : {}),
    }

    try {
      const client = createXiansClient()
      await client.put<TenantMetadataEntry>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/metadata/${METADATA_KEY}`,
        { value: JSON.stringify(config), type: 'Secret' },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ config })
    } catch (error) {
      return handleApiError(error, 'settings/temporal PUT', {
        fallbackMessage: 'Failed to save Temporal configuration',
      })
    }
  }
)

/**
 * DELETE /api/settings/temporal
 * Remove the current tenant's Temporal override, reverting to the default
 * Temporal server. System administrators only.
 */
export const DELETE = withSystemAdminTenant(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/metadata/${METADATA_KEY}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      if (error instanceof XiansApiError && error.status === 404) {
        return new NextResponse(null, { status: 204 })
      }
      return handleApiError(error, 'settings/temporal DELETE', {
        fallbackMessage: 'Failed to revert to the default Temporal configuration',
      })
    }
  }
)
