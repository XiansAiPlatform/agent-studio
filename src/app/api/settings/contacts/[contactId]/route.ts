import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

type ContactParams = { contactId: string }

function contactPath(tenantId: string, rawId: string | undefined): string | NextResponse {
  const contactId = encodeSafePathSegment(rawId)
  if (!contactId) {
    return NextResponse.json({ error: 'A valid contact ID is required' }, { status: 400 })
  }
  return `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/contacts/${contactId}`
}

/**
 * PATCH /api/settings/contacts/[contactId]
 * Update a contact. Body: { name?, email?, phone? } — an empty phone clears it.
 */
export const PATCH = withTenantAdmin(
  async (request: NextRequest, { tenantContext, params }: ApiContext<ContactParams>) => {
    const tenantId = tenantContext.tenant.id
    const path = contactPath(tenantId, params.contactId)
    if (path instanceof NextResponse) return path

    let body: { name?: string; email?: string; phone?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      const contact = await client.patch<unknown>(
        path,
        { name: body.name, email: body.email, phone: body.phone },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(contact)
    } catch (error) {
      return handleApiError(error, 'settings/contacts PATCH', {
        fallbackMessage: 'Failed to update contact',
      })
    }
  }
)

/**
 * DELETE /api/settings/contacts/[contactId]
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext, params }: ApiContext<ContactParams>) => {
    const tenantId = tenantContext.tenant.id
    const path = contactPath(tenantId, params.contactId)
    if (path instanceof NextResponse) return path

    try {
      const client = createXiansClient()
      await client.delete<unknown>(path, { headers: { 'X-Tenant-Id': tenantId } })
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/contacts DELETE', {
        fallbackMessage: 'Failed to delete contact',
      })
    }
  }
)
