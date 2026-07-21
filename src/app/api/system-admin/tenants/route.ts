import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { Tenant } from '@/app/(dashboard)/system-admin/tenants/types'

/**
 * GET /api/system-admin/tenants
 * List every tenant on the platform. System administrators only.
 *
 * Authorization is enforced server-side via withSystemAdmin — the browser page
 * cannot bypass it. The upstream Xians AdminApi is called with the service API
 * key (no tenant header) which resolves to SysAdmin scope.
 */
export const GET = withSystemAdmin(async () => {
  try {
    const client = createXiansClient()
    const tenants = await client.get<Tenant[]>('/api/v1/admin/tenants')
    return NextResponse.json({ tenants: tenants ?? [] })
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants GET', {
      fallbackMessage: 'Failed to list tenants',
    })
  }
})

/**
 * POST /api/system-admin/tenants
 * Create a new tenant. System administrators only.
 */
export const POST = withSystemAdmin(async (request: NextRequest) => {
  let body: {
    tenantId?: string
    name?: string
    domain?: string
    description?: string
    theme?: string
    timezone?: string
    useSpecificTemporalNamespace?: boolean
    temporalHost?: string
    temporalNamespace?: string
    temporalCertificate?: string
    temporalCertificateKey?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.tenantId || !body.name) {
    return NextResponse.json(
      { error: 'tenantId and name are required' },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    const data = await client.post<{ tenant?: Tenant } & Tenant>(
      '/api/v1/admin/tenants',
      {
        tenantId: body.tenantId,
        name: body.name,
        domain: body.domain || undefined,
        description: body.description || undefined,
        theme: body.theme || undefined,
        timezone: body.timezone || undefined,
        useSpecificTemporalNamespace: body.useSpecificTemporalNamespace ?? false,
        temporalHost: body.temporalHost || undefined,
        temporalNamespace: body.temporalNamespace || undefined,
        temporalCertificate: body.temporalCertificate || undefined,
        temporalCertificateKey: body.temporalCertificateKey || undefined,
      }
    )
    // Backend returns { tenant, location }; normalise to the tenant itself.
    const created = (data && 'tenant' in data ? data.tenant : data) ?? data
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants POST', {
      fallbackMessage: 'Failed to create tenant',
    })
  }
})
