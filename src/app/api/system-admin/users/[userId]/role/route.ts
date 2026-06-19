import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { ALL_ROLES } from '@/app/(dashboard)/system-admin/users/types'

/**
 * System Admin → manage per-tenant roles for a user.
 * All handlers require a system admin caller (enforced via withSystemAdmin).
 *
 * PUT    → add / set a role via PATCH on the participant user resource
 * DELETE → remove a specific role via DELETE on the participant user roles sub-resource
 */

/** Extract userId from /api/system-admin/users/{userId}/role. */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/role$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  return tenantId && tenantId.trim() ? tenantId.trim() : null
}

/**
 * PUT /api/system-admin/users/[userId]/role?tenantId=
 * Add a role to the user within the given tenant.
 * Proxies to PATCH /api/v1/admin/tenants/{tenantId}/users/{userId} with { role }.
 */
export const PUT = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = getTenantId(request)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.role || !ALL_ROLES.includes(body.role as (typeof ALL_ROLES)[number])) {
    return NextResponse.json(
      { error: `role must be one of: ${ALL_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    const data = await client.patch(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
      { role: body.role }
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/role PUT', {
      fallbackMessage: 'Failed to add role',
    })
  }
})

/**
 * DELETE /api/system-admin/users/[userId]/role?tenantId=&role=
 * Remove a specific role from the user within the given tenant.
 * Proxies to DELETE /api/v1/admin/tenants/{tenantId}/users/{userId}/roles/{role}.
 */
export const DELETE = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = getTenantId(request)
  const role = request.nextUrl.searchParams.get('role')?.trim() || null

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }
  if (!role || !ALL_ROLES.includes(role as (typeof ALL_ROLES)[number])) {
    return NextResponse.json(
      { error: `role query param must be one of: ${ALL_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    await client.delete(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/role DELETE', {
      fallbackMessage: 'Failed to remove role',
    })
  }
})
