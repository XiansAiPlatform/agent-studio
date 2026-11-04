import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { canManageSecretOwner, resolveSecretAccess } from '@/lib/api/secret-access'
import { assertCanEditAgent } from '@/lib/auth/agent-access'
import { agentHasActivation, resolveAgentNameById } from '@/lib/api/secret-agent-scope'
import {
  buildAdminSecretCreatePayload,
  type CreateSecretBody,
} from '@/app/(dashboard)/settings/secrets/types'

/**
 * GET /api/settings/secrets
 * List secrets for the current tenant (all stored scopes). Tenant comes from
 * the httpOnly cookie. Accessible by anyone with settings:view
 * (TenantParticipantAdmin, TenantUser, TenantAdmin, SysAdmin).
 *
 * Callers without secrets:manage-user-scoped only see tenant/agent/activation
 * secrets plus their own user-scoped secrets.
 */
export const GET = withParticipantAdmin(
  async (_request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const access = await resolveSecretAccess(session, tenantId)
      const client = createXiansClient()
      const data = await client.get<Array<{ userId?: string | null }>>(
        `/api/v1/admin/secrets?tenantId=${encodeURIComponent(tenantId)}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      const visible = (data ?? []).filter((secret) =>
        canManageSecretOwner(access, secret?.userId)
      )
      return NextResponse.json(visible)
    } catch (error) {
      return handleApiError(error, 'settings/secrets GET', {
        fallbackMessage: 'Failed to list secrets',
      })
    }
  }
)

/**
 * POST /api/settings/secrets
 * Create a tenant-, user-, agent- or activation-scoped secret. Tenant is always
 * the cookie tenant.
 *
 * Request body: {
 *   key: string
 *   value: string
 *   scope?: 'tenant' | 'user' | 'agent' | 'activation'  // default tenant
 *   userId?: string          // required when scope is user (participant id)
 *   agentId?: string         // agent object id; required for agent / activation
 *                            // (used for the access check only on activation)
 *   activationName?: string  // required when scope is activation
 *   description?: string
 * }
 *
 * `scope` only drives validation; the Admin API infers scope from the ids.
 * A user-scoped secret for anyone other than the caller requires
 * secrets:manage-user-scoped. Agent / activation scopes require write access
 * to the agent, resolved server-side from `agentId`.
 */
export const POST = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: CreateSecretBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const result = buildAdminSecretCreatePayload(tenantId, body)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    try {
      if (result.payload.userId) {
        const access = await resolveSecretAccess(session, tenantId)
        if (!canManageSecretOwner(access, result.payload.userId)) {
          return NextResponse.json(
            { error: 'You can only create user-scoped secrets for yourself' },
            { status: 403 }
          )
        }
      }

      const client = createXiansClient()

      if (result.authAgentId) {
        const agentName = await resolveAgentNameById(client, tenantId, result.authAgentId)
        if (!agentName) {
          return NextResponse.json({ error: 'Agent not found in this tenant' }, { status: 400 })
        }

        // The Admin API only receives the activation name, so confirm it is one
        // of the selected agent's activations before authorizing on that agent.
        const { activationName } = result.payload
        if (
          activationName &&
          !(await agentHasActivation(client, tenantId, agentName, activationName))
        ) {
          return NextResponse.json(
            { error: 'Activation not found for the selected agent' },
            { status: 400 }
          )
        }

        const denied = await assertCanEditAgent(session, tenantId, agentName)
        if (denied) return denied
      }

      const data = await client.post<unknown>(
        `/api/v1/admin/secrets`,
        result.payload,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'settings/secrets POST', {
        fallbackMessage: 'Failed to create secret',
      })
    }
  }
)
