import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * PUT /api/system-admin/users/[userId]/status
 *
 * Enable or disable a user account.
 *
 * Without tenantId: uses the global endpoint PUT /api/v1/admin/users/{userId}/status
 *   — affects the user's account platform-wide.
 *
 * With tenantId: uses the tenant-scoped enable/disable endpoint
 *   PUT /api/v1/admin/tenants/{tenantId}/users/{userId}/enable|disable
 *   — kept for backward compatibility when operating in tenant context.
 */

function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/status$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const v = request.nextUrl.searchParams.get('tenantId')
  return v && v.trim() ? v.trim() : null
}

export const PUT = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  let body: { enabled?: boolean; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 })
  }

  const tenantId = getTenantId(request)

  try {
    const client = createXiansClient()

    if (!tenantId) {
      // Global status update — no tenant context required.
      const data = await client.put(
        `/api/v1/admin/users/${encodeURIComponent(userId)}/status`,
        { enabled: body.enabled, reason: body.reason }
      )
      return NextResponse.json(data)
    }

    // Tenant-scoped enable / disable (legacy path).
    const action = body.enabled ? 'enable' : 'disable'
    const data = await client.put(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/${action}`,
      body.reason ? { reason: body.reason } : {}
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/status PUT', {
      fallbackMessage: 'Failed to update user status',
    })
  }
})
