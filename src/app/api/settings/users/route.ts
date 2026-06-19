import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { TENANT_ROLES } from '@/app/(dashboard)/system-admin/users/types'

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

      // Normalize each user so `roles` is always a string array regardless of
      // whether the backend returns `roles` (array) or `role` (singular string).
      const users = (data.users ?? []).map((u: any) => ({
        ...u,
        roles: Array.isArray(u.roles)
          ? u.roles
          : u.role != null
            ? [u.role]
            : [],
      }))

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
 * Create a new tenant user with one or more roles.
 * Only accessible by TenantParticipantAdmin.
 *
 * The Xians API creates a user with a single initial role, then each additional
 * role is added via subsequent PATCH calls on the tenant user resource.
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: { email?: string; name?: string; roles?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.email || !body.name) {
      return NextResponse.json(
        { error: 'email and name are required' },
        { status: 400 }
      )
    }

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

    try {
      const client = createXiansClient()

      // Create the user with the first role.
      const created = await client.post<{ userId: string }>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users`,
        { email: body.email, name: body.name, role: roles[0] },
        { headers: { 'X-Tenant-Id': tenantId } }
      )

      // Add any additional roles.
      for (const role of roles.slice(1)) {
        await client.patch(
          `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(created.userId)}`,
          { role },
          { headers: { 'X-Tenant-Id': tenantId } }
        )
      }

      return NextResponse.json(created, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'settings/users POST', {
        fallbackMessage: 'Failed to create user',
      })
    }
  }
)
