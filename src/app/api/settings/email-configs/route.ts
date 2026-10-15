import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { EmailConfigStatus } from '@/app/(dashboard)/tenant-settings/email-configs/types'

const smtpConfigPath = (tenantId: string) =>
  `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/smtp-config`

/**
 * GET /api/settings/email-configs
 * Returns which SMTP server the current tenant uses (Tenant, Server, or None
 * when email is off) and the tenant's SMTP settings without the password.
 * TenantAdmin (or system admin) only.
 */
export const GET = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const status = await client.get<EmailConfigStatus>(smtpConfigPath(tenantId), {
        headers: { 'X-Tenant-Id': tenantId },
      })
      return NextResponse.json(status)
    } catch (error) {
      return handleApiError(error, 'settings/email-configs GET', {
        fallbackMessage: 'Failed to load email configuration',
      })
    }
  }
)

/**
 * PUT /api/settings/email-configs
 * Saves the current tenant's SMTP server, overriding the server default.
 * A blank password keeps the saved one.
 * The backend validates the fields. TenantAdmin (or system admin) only.
 */
export const PUT = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'The email configuration must be a JSON object' },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      const status = await client.put<EmailConfigStatus>(smtpConfigPath(tenantId), body, {
        headers: { 'X-Tenant-Id': tenantId },
      })
      return NextResponse.json(status)
    } catch (error) {
      return handleApiError(error, 'settings/email-configs PUT', {
        fallbackMessage: 'Failed to save email configuration',
      })
    }
  }
)

/**
 * DELETE /api/settings/email-configs
 * Removes the tenant's SMTP server so the server default applies again.
 * Returns the new status. TenantAdmin (or system admin) only.
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      const status = await client.delete<EmailConfigStatus>(smtpConfigPath(tenantId), {
        headers: { 'X-Tenant-Id': tenantId },
      })
      return NextResponse.json(status)
    } catch (error) {
      return handleApiError(error, 'settings/email-configs DELETE', {
        fallbackMessage: 'Failed to reset to the server default',
      })
    }
  }
)
