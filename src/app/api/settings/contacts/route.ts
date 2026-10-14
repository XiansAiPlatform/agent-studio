import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { contactSchema, firstIssue } from '@/app/(dashboard)/tenant-settings/contacts/schema'

/**
 * GET /api/settings/contacts?search=
 * List the current tenant's notification contacts. TenantAdmin (or system admin) only.
 */
export const GET = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const search = request.nextUrl.searchParams.get('search') ?? ''
    const query = search ? `?search=${encodeURIComponent(search)}` : ''

    try {
      const client = createXiansClient()
      const contacts = await client.get<unknown[]>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/contacts${query}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(contacts ?? [])
    } catch (error) {
      return handleApiError(error, 'settings/contacts GET', {
        fallbackMessage: 'Failed to list contacts',
      })
    }
  }
)

/**
 * POST /api/settings/contacts
 * Create a contact. Body: { name, email, phone? }
 */
export const POST = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = contactSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
    }
    const body = parsed.data

    try {
      const client = createXiansClient()
      const contact = await client.post<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/contacts`,
        { name: body.name, email: body.email, phone: body.phone },
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(contact, { status: 201 })
    } catch (error) {
      return handleApiError(error, 'settings/contacts POST', {
        fallbackMessage: 'Failed to create contact',
      })
    }
  }
)
