import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TENANT_ROLES } from '@/app/(dashboard)/system-admin/users/types'

/**
 * System Admin → Users API.
 *
 * GET without tenantId  → global list via GET /api/v1/admin/users (native pagination,
 *                          no fan-out required).
 * GET with tenantId     → tenant-scoped list via GET /api/v1/admin/tenants/{id}/users.
 * POST with tenantId    → create user in a specific tenant.
 */

function getTenantId(request: NextRequest): string | null {
  const v = request.nextUrl.searchParams.get('tenantId')
  return v && v.trim() ? v.trim() : null
}

/**
 * GET /api/system-admin/users
 *
 * Without tenantId: lists all users across the platform using the global
 *   endpoint GET /api/v1/admin/users (supports page, pageSize, search,
 *   isSysAdmin, isEnabled and role filters; role may be 'SysAdmin' or any
 *   tenant role, matched in any tenant).
 *
 * With tenantId: lists users for that specific tenant (paginated).
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const tenantId = getTenantId(request)
  const params = request.nextUrl.searchParams

  // ── Global list ──────────────────────────────────────────────────────────
  if (!tenantId) {
    const upstreamQuery = new URLSearchParams()
    upstreamQuery.set('page', params.get('page') ?? '1')
    upstreamQuery.set('pageSize', params.get('pageSize') ?? '20')
    const search = params.get('search')
    if (search?.trim()) upstreamQuery.set('search', search.trim())
    const isSysAdmin = params.get('isSysAdmin')
    if (isSysAdmin !== null) upstreamQuery.set('isSysAdmin', isSysAdmin)
    const isEnabled = params.get('isEnabled')
    if (isEnabled !== null) upstreamQuery.set('isEnabled', isEnabled)
    const globalRole = params.get('role')
    if (globalRole?.trim()) upstreamQuery.set('role', globalRole.trim())

    try {
      const client = createXiansClient()
      const data = await client.get(`/api/v1/admin/users?${upstreamQuery.toString()}`)
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'system-admin/users GET (global)', {
        fallbackMessage: 'Failed to list users',
      })
    }
  }

  // ── Tenant-scoped list ────────────────────────────────────────────────────
  const upstreamQuery = new URLSearchParams()
  upstreamQuery.set('page', params.get('page') ?? '1')
  upstreamQuery.set('pageSize', params.get('pageSize') ?? '20')
  const search = params.get('search')
  if (search?.trim()) upstreamQuery.set('search', search.trim())
  const role = params.get('role')
  if (role?.trim()) upstreamQuery.set('role', role.trim())

  try {
    const client = createXiansClient()
    const data = await client.get(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${upstreamQuery.toString()}`
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users GET (tenant)', {
      fallbackMessage: 'Failed to list users',
    })
  }
})

/**
 * POST /api/system-admin/users?tenantId=
 * Create a new user in the specified tenant. tenantId is required.
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
