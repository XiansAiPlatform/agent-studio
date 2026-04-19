import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/settings/users
 * List tenant participant users (paginated). Tenant is resolved from the httpOnly cookie.
 * Only accessible by TenantParticipantAdmin.
 */
export const GET = withParticipantAdmin(
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
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'settings/users GET', {
        fallbackMessage: 'Failed to list users',
      })
    }
  }
)

/**
 * POST /api/settings/users
 * Create a new tenant participant user.
 * Only accessible by TenantParticipantAdmin.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: { email?: string; name?: string; role?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.email || !body.name || !body.role) {
      return NextResponse.json(
        { error: 'email, name, and role are required' },
        { status: 400 }
      )
    }

    if (
      body.role !== 'TenantParticipant' &&
      body.role !== 'TenantParticipantAdmin'
    ) {
      return NextResponse.json(
        {
          error:
            'role must be TenantParticipant or TenantParticipantAdmin',
        },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      const data = await client.post<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users`,
        { email: body.email, name: body.name, role: body.role },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'settings/users POST', {
        fallbackMessage: 'Failed to create user',
      })
    }
  }
)
