import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { Tenant } from '@/app/(dashboard)/system-admin/tenants/types'

/**
 * Extract tenantId from the URL path: /api/system-admin/tenants/{tenantId}
 */
function extractTenantId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/tenants\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /api/system-admin/tenants/[tenantId]
 * Fetch a single tenant by its tenant identifier. System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = extractTenantId(request.nextUrl.pathname)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const tenant = await client.get<Tenant>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`
    )
    return NextResponse.json(tenant)
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants/[tenantId] GET', {
      fallbackMessage: 'Failed to fetch tenant',
    })
  }
})

/**
 * PATCH /api/system-admin/tenants/[tenantId]
 * Update a tenant (incl. enable/disable via `enabled`). System administrators only.
 */
export const PATCH = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = extractTenantId(request.nextUrl.pathname)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  let body: {
    name?: string
    domain?: string
    description?: string
    theme?: string
    timezone?: string
    enabled?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const tenant = await client.patch<Tenant>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
      body
    )
    return NextResponse.json(tenant)
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants/[tenantId] PATCH', {
      fallbackMessage: 'Failed to update tenant',
    })
  }
})

/**
 * DELETE /api/system-admin/tenants/[tenantId]
 * Permanently delete a tenant. System administrators only.
 */
export const DELETE = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = extractTenantId(request.nextUrl.pathname)
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    await client.delete<unknown>(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'system-admin/tenants/[tenantId] DELETE', {
      fallbackMessage: 'Failed to delete tenant',
    })
  }
})
