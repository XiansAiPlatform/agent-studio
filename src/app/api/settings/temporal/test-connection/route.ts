import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdminTenant, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TemporalConfig } from '@/app/(dashboard)/tenant-settings/temporal/types'

/**
 * POST /api/settings/temporal/test-connection
 * Attempts to connect with the given server URL/namespace/credentials without
 * saving anything. System administrators only.
 */
export const POST = withSystemAdminTenant(
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
      await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/temporal-config/test-connection`,
        {
          // tenantId is a required field on the backend's request DTO, though the handler
          // itself ignores it — the test connects directly with the given fields.
          tenantId,
          serverUrl: serverUrl.trim(),
          namespace: namespace.trim(),
          certificate: certificate || undefined,
          privateKey: privateKey || undefined,
        },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ success: true })
    } catch (error) {
      return handleApiError(error, 'settings/temporal test-connection POST', {
        fallbackMessage: 'Could not connect to Temporal',
      })
    }
  }
)
