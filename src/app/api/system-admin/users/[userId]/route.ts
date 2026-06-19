import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * System Admin → single user operations.
 *
 * GET    → global user detail (with all tenant memberships)
 *          via GET /api/v1/admin/users/{userId}
 *
 * PATCH  → global profile update (name, email) — always uses the global endpoint.
 *          The tenant participant endpoint is never used for profile edits and
 *          rejects SysAdmin users. Role changes go through /[userId]/role instead.
 *          via PATCH /api/v1/admin/users/{userId}
 *
 * DELETE → remove user from a specific tenant (tenantId required)
 *          via DELETE /api/v1/admin/tenants/{tenantId}/users/{userId}
 */

function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const v = request.nextUrl.searchParams.get('tenantId')
  return v && v.trim() ? v.trim() : null
}

/**
 * GET /api/system-admin/users/[userId]
 * Returns full user detail + all tenant memberships. No tenantId required.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.get(`/api/v1/admin/users/${encodeURIComponent(userId)}`)
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId] GET', {
      fallbackMessage: 'Failed to fetch user',
    })
  }
})

/**
 * PATCH /api/system-admin/users/[userId]
 *
 * Updates global profile fields (name, email) via the platform-wide endpoint.
 * Always routes to PATCH /api/v1/admin/users/{userId} — the tenant participant
 * endpoint is never used for profile edits and rejects SysAdmin users entirely.
 */
export const PATCH = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Only name and email are updatable globally; ignore any other fields.
  const globalBody: { name?: string; email?: string } = {}
  if (typeof body.name === 'string') globalBody.name = body.name
  if (typeof body.email === 'string') globalBody.email = body.email

  if (Object.keys(globalBody).length === 0) {
    return NextResponse.json(
      { error: 'Provide name and/or email to update' },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    const data = await client.patch(
      `/api/v1/admin/users/${encodeURIComponent(userId)}`,
      globalBody
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
 * Remove the user's membership from a specific tenant. tenantId is required.
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
