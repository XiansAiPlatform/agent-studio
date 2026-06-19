import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * PUT /api/system-admin/users/[userId]/sysadmin
 *
 * Grant or revoke the global System Admin flag without requiring a tenant.
 * Proxies to PUT /api/v1/admin/users/{userId}/sysadmin.
 */

function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/sysadmin$/)
  return match ? decodeURIComponent(match[1]) : null
}

export const PUT = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  let body: { isSysAdmin?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.isSysAdmin !== 'boolean') {
    return NextResponse.json({ error: 'isSysAdmin (boolean) is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.put(
      `/api/v1/admin/users/${encodeURIComponent(userId)}/sysadmin`,
      { isSysAdmin: body.isSysAdmin }
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/sysadmin PUT', {
      fallbackMessage: 'Failed to update System Admin status',
    })
  }
})
