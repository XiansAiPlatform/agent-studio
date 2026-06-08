import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * System Admin → single user operations.
 * System administrators only (enforced via withSystemAdmin). Targets the
 * tenant-scoped Xians AdminApi user endpoints.
 */

/** Extract userId from /api/system-admin/users/{userId}. */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  return tenantId && tenantId.trim() ? tenantId.trim() : null
}

/**
 * PATCH /api/system-admin/users/[userId]?tenantId=
 * Update a user's name / email / role / approval within a tenant.
 */
export const PATCH = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = getTenantId(request)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  let body: {
    name?: string
    email?: string
    role?: string
    isApproved?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.patch(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
      body
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId] PATCH', {
      fallbackMessage: 'Failed to update user',
    })
  }
})

/**
 * DELETE /api/system-admin/users/[userId]?tenantId=
 * Remove the user's membership of the tenant.
 */
export const DELETE = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = getTenantId(request)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    await client.delete(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId] DELETE', {
      fallbackMessage: 'Failed to remove user',
    })
  }
})
