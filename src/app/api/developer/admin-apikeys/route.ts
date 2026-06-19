import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/developer/admin-apikeys
 * List all admin API keys for the current user within the current tenant.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const userId = session.user?.email ?? session.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId })
      const data = await client.get(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/admin-apikeys?${params.toString()}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'developer/admin-apikeys GET', {
        fallbackMessage: 'Failed to list admin API keys',
      })
    }
  }
)

/**
 * POST /api/developer/admin-apikeys
 * Create a new admin API key for the current user.
 * Body: { name: string }
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const userId = session.user?.email ?? session.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    let body: { name?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId })
      const data = await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/admin-apikeys?${params.toString()}`,
        { name: body.name.trim() },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'developer/admin-apikeys POST', {
        fallbackMessage: 'Failed to create admin API key',
      })
    }
  }
)
