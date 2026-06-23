import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/developer/agent-certificates
 * List all agent certificates for the current user within the current tenant.
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    // Identify the user by email. The backend resolves the agent (certificate OU) to a
    // user during agent authentication; email is the identifier this app shares with the
    // backend (the OIDC sub differs per provider and is not stored server-side).
    const userId = session.user?.email ?? session.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId })
      const data = await client.get(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-certificates?${params.toString()}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'developer/agent-certificates GET', {
        fallbackMessage: 'Failed to list agent certificates',
      })
    }
  }
)

/**
 * POST /api/developer/agent-certificates
 * Generate a new agent certificate for the current user.
 * Body: { revokePrevious?: boolean }
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    // Identify the user by email. See GET handler above.
    const userId = session.user?.email ?? session.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 401 })
    }

    let body: { name?: string; revokePrevious?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // body is optional — name defaults to empty string
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const revokePrevious = body.revokePrevious === true

    try {
      const client = createXiansClient()
      const params = new URLSearchParams({ userId, name: body.name.trim(), revokePrevious: String(revokePrevious) })
      const data = await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/agent-certificates/generate?${params.toString()}`,
        undefined,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'developer/agent-certificates POST', {
        fallbackMessage: 'Failed to generate agent certificate',
      })
    }
  }
)
