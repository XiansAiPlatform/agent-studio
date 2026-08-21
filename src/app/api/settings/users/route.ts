import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TENANT_ROLES } from '@/app/(dashboard)/system-admin/users/types'
import { normalizeTenantUser } from '@/app/(dashboard)/tenant-settings/users/types'

/**
 * GET /api/settings/users
 * List tenant users (paginated). Tenant is resolved from the httpOnly cookie.
 * Only accessible by TenantParticipantAdmin.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const { searchParams } = new URL(request.url)

    const page = searchParams.get('page') ?? '1'
    const pageSize = searchParams.get('pageSize') ?? '20'
    const search = searchParams.get('search') ?? ''

    const params = new URLSearchParams({ page, pageSize })
    if (search) params.set('search', search)

    try {
      const client = createXiansClient()
      const data = await client.get<{
        users: unknown[]
        totalCount: number
        page: number
        pageSize: number
      }>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${params.toString()}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )

      // Normalize each user so roles and identity/lockout metadata are always
      // present in camelCase regardless of upstream naming.
      const users = (data.users ?? []).map((u) => normalizeTenantUser(u))

      return NextResponse.json({ ...data, users })
    } catch (error) {
      return handleApiError(error, 'settings/users GET', {
        fallbackMessage: 'Failed to list users',
      })
    }
  }
)

/**
 * POST /api/settings/users
 * Add a user to this tenant with one or more roles.
 * Only accessible by TenantParticipantAdmin.
 *
 * Two modes, matching POST /api/v1/admin/tenants/{tenantId}/users:
 *
 * 1. Existing account — send `userId` and `roles`. An email address is not
 *    accepted in `userId`, because the same address can belong to accounts from
 *    more than one identity provider. The upstream answers 404 for an unknown
 *    id and 409 for a disabled account.
 * 2. New account — send `email`, `name` and `roles`. The upstream answers 409 if
 *    any account already holds that address; the operator then has to switch to
 *    mode 1 with that account's user id.
 *
 * The Xians API adds the user with a single initial role, then each additional
 * role is applied via subsequent PATCH calls on the tenant user resource.
 *
 * Note that a tenant admin cannot look up a user id themselves: the
 * tenant-scoped user list only returns members of their own tenant and the
 * global list requires SysAdmin. The UI therefore tells them to ask a system
 * administrator for it.
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: { userId?: string; email?: string; name?: string; roles?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const userId = body.userId?.trim()
    const email = body.email?.trim()
    const name = body.name?.trim()

    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return NextResponse.json(
        { error: 'roles must be a non-empty array' },
        { status: 400 }
      )
    }

    const roles = body.roles as string[]
    const invalidRole = roles.find(
      (r) => !TENANT_ROLES.includes(r as (typeof TENANT_ROLES)[number])
    )
    if (invalidRole) {
      return NextResponse.json(
        { error: `Invalid role "${invalidRole}". Allowed: ${TENANT_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!userId && !email && !name) {
      return NextResponse.json(
        {
          error:
            'Provide either userId (existing account) or email and name (new account)',
        },
        { status: 400 }
      )
    }

    // Only the fields that select the mode are forwarded: the upstream ignores
    // email and name whenever userId is present.
    let payload: Record<string, string>
    if (userId) {
      if (userId.includes('@')) {
        return NextResponse.json(
          { error: 'userId must be a user id, not an email address.' },
          { status: 400 }
        )
      }
      payload = { userId, role: roles[0] }
    } else {
      if (!email || !name) {
        return NextResponse.json(
          { error: 'email and name are required when creating a new account' },
          { status: 400 }
        )
      }
      payload = { email, name, role: roles[0] }
    }

    try {
      const client = createXiansClient()

      // Add the user with the first role.
      const created = await client.post<{ userId: string }>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users`,
        payload,
        { headers: { 'X-Tenant-Id': tenantId } }
      )

      // The additional-role calls address the account by id. In mode 1 that id
      // is already known, so only mode 2 depends on the response carrying it.
      const addedUserId = created?.userId || userId
      if (!addedUserId) {
        return NextResponse.json(
          {
            error:
              'User was added but the server did not return a user id, so the additional roles were not applied.',
          },
          { status: 502 }
        )
      }

      // Add any additional roles.
      for (const role of roles.slice(1)) {
        await client.patch(
          `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(addedUserId)}`,
          { role },
          { headers: { 'X-Tenant-Id': tenantId } }
        )
      }

      return NextResponse.json(created ?? { userId: addedUserId }, { status: 201 })
    } catch (error) {
      // handleApiError forwards upstream 4xx messages verbatim. The 400/404/409
      // bodies here tell the operator what to do next (supply a user id, ask an
      // admin to enable the account), so they must not be replaced.
      return handleApiError(error, 'settings/users POST', {
        fallbackMessage: userId ? 'Failed to add user to tenant' : 'Failed to create user',
      })
    }
  }
)
