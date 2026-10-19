import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * POST /api/settings/email-configs/test
 * Sends a test email with the given SMTP settings, without saving them, to the
 * signed-in user. A blank password uses the saved one. The recipient is always
 * taken from the session, never from the request body.
 * TenantAdmin (or system admin) only.
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const to = session.user.email

    if (!to) {
      return NextResponse.json(
        { error: 'Your account has no email address to send the test email to' },
        { status: 400 }
      )
    }

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
      await client.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/smtp-config/test`,
        { ...body, to },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ success: true, to })
    } catch (error) {
      return handleApiError(error, 'settings/email-configs test POST', {
        fallbackMessage: 'Could not send test email',
      })
    }
  }
)
