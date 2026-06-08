import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TENANT_ROLES } from '@/app/(dashboard)/system-admin/users/types'

/**
 * System Admin → Users API.
 *
 * Authorization is enforced server-side via withSystemAdmin — only verified
 * platform system administrators reach these handlers. The upstream Xians
 * AdminApi is called with the service API key (which resolves to SysAdmin
 * scope), targeting the tenant-scoped user endpoints
 * (/api/v1/admin/tenants/{tenantId}/users).
 *
 * The tenant to operate on is supplied as a `tenantId` query parameter because
 * these are cross-tenant system-admin operations (the admin explicitly selects
 * which tenant's users to manage).
 */

/** Read and validate the required `tenantId` query parameter. */
function getTenantId(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  return tenantId && tenantId.trim() ? tenantId.trim() : null
}

/**
 * GET /api/system-admin/users?tenantId=&page=&pageSize=&search=&role=
 * List the users that belong to a tenant. System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = getTenantId(request)
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const params = request.nextUrl.searchParams
  const upstreamQuery = new URLSearchParams()
  upstreamQuery.set('page', params.get('page') ?? '1')
  upstreamQuery.set('pageSize', params.get('pageSize') ?? '20')
  const search = params.get('search')
  if (search && search.trim()) upstreamQuery.set('search', search.trim())
  const role = params.get('role')
  if (role && role.trim()) upstreamQuery.set('role', role.trim())

  try {
    const client = createXiansClient()
    const data = await client.get(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${upstreamQuery.toString()}`
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users GET', {
      fallbackMessage: 'Failed to list users',
    })
  }
})

/**
 * POST /api/system-admin/users?tenantId=
 * Create a new user in the tenant and grant them a tenant-scoped role.
 * System administrators only.
 */
export const POST = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = getTenantId(request)
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  let body: { email?: string; name?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.email || !body.name || !body.role) {
    return NextResponse.json(
      { error: 'email, name and role are required' },
      { status: 400 }
    )
  }

  if (!TENANT_ROLES.includes(body.role as (typeof TENANT_ROLES)[number])) {
    return NextResponse.json(
      { error: `role must be one of: ${TENANT_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    const data = await client.post(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users`,
      { email: body.email, name: body.name, role: body.role }
    )
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'system-admin/users POST', {
      fallbackMessage: 'Failed to create user',
    })
  }
})
