import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type {
  TenantUser,
  UserTenantMembership,
  GetUserTenantsResponse,
} from '@/app/(dashboard)/system-admin/users/types'
import type { Tenant } from '@/app/(dashboard)/system-admin/tenants/types'

/**
 * System Admin → user tenant memberships.
 *
 * GET /api/system-admin/users/[userId]/tenants?email=
 *
 * Returns all tenants the given user belongs to, along with their role in each
 * tenant. Because the Xians backend exposes user data per-tenant, we fan out to
 * every tenant, search for the user by email, and aggregate the results.
 */

function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/tenants$/)
  return match ? decodeURIComponent(match[1]) : null
}

export const GET = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const email = request.nextUrl.searchParams.get('email')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()

    const tenantsRaw = await client.get<unknown>('/api/v1/admin/tenants')

    // Normalise — backend may return a plain array or a wrapped object.
    const tenants: Tenant[] = Array.isArray(tenantsRaw)
      ? (tenantsRaw as Tenant[])
      : Array.isArray((tenantsRaw as { tenants?: Tenant[] })?.tenants)
        ? (tenantsRaw as { tenants: Tenant[] }).tenants
        : []

    const results = await Promise.allSettled(
      (tenants ?? []).map(async (tenant): Promise<UserTenantMembership | null> => {
        const data = await client
          .get<{ users?: TenantUser[] }>(
            `/api/v1/admin/tenants/${encodeURIComponent(tenant.tenantId)}/users?page=1&pageSize=20&search=${encodeURIComponent(email.trim())}`
          )
          .catch(() => ({ users: [] as TenantUser[] }))

        const users: TenantUser[] = data.users ?? []
        const match = users.find(
          (u) =>
            u.userId === userId ||
            u.email.toLowerCase() === email.trim().toLowerCase()
        )
        if (!match) return null

        return {
          tenantId: tenant.tenantId,
          tenantName: tenant.name,
          roles: match.roles ?? [],
          isApproved: match.isApproved,
        }
      })
    )

    const memberships = results
      .filter(
        (r): r is PromiseFulfilledResult<UserTenantMembership | null> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((m): m is UserTenantMembership => m !== null)
      .sort((a, b) =>
        a.tenantName.localeCompare(b.tenantName, undefined, { sensitivity: 'base' })
      )

    const response: GetUserTenantsResponse = {
      userId,
      email: email.trim(),
      memberships,
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/tenants GET', {
      fallbackMessage: 'Failed to fetch user tenant memberships',
    })
  }
})
