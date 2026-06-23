import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

// Mirror the backend Logo model constraints so we fail fast with a clear message
// instead of surfacing a raw validation error from the server.
const MAX_BASE64_LENGTH = 1_000_000
const MAX_URL_LENGTH = 500
const MIN_DIMENSION = 1
const MAX_DIMENSION = 10000

interface LogoBody {
  url?: unknown
  imgBase64?: unknown
  width?: unknown
  height?: unknown
}

/**
 * Strip an optional `data:[mime];base64,` prefix so the payload matches the
 * backend's pure-base64 validation.
 */
function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',')
  return value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value
}

function isValidDimension(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_DIMENSION &&
    value <= MAX_DIMENSION
  )
}

/**
 * PUT /api/settings/branding/logo
 * Set (create or replace) the current tenant's logo. Accepts either an external
 * image URL or a base64-encoded image, plus its width/height (both required by
 * the backend Logo model). TenantAdmin (or system admin) only.
 *
 * Body: { url?: string, imgBase64?: string, width: number, height: number }
 */
export const PUT = withTenantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    let body: LogoBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const hasUrl = typeof body.url === 'string' && body.url.trim() !== ''
    const hasBase64 =
      typeof body.imgBase64 === 'string' && body.imgBase64.trim() !== ''

    if (hasUrl === hasBase64) {
      return NextResponse.json(
        { error: 'Provide exactly one of url or imgBase64' },
        { status: 400 }
      )
    }

    if (!isValidDimension(body.width) || !isValidDimension(body.height)) {
      return NextResponse.json(
        {
          error: `width and height must be integers between ${MIN_DIMENSION} and ${MAX_DIMENSION}`,
        },
        { status: 400 }
      )
    }

    const logo: {
      url?: string
      imgBase64?: string
      width: number
      height: number
    } = { width: body.width, height: body.height }

    if (hasUrl) {
      const url = (body.url as string).trim()
      if (url.length > MAX_URL_LENGTH) {
        return NextResponse.json(
          { error: `Logo URL cannot exceed ${MAX_URL_LENGTH} characters` },
          { status: 400 }
        )
      }
      logo.url = url
    } else {
      const imgBase64 = stripDataUrlPrefix((body.imgBase64 as string).trim())
      if (imgBase64.length > MAX_BASE64_LENGTH) {
        return NextResponse.json(
          { error: 'Image is too large. Please use an image under ~700KB.' },
          { status: 400 }
        )
      }
      logo.imgBase64 = imgBase64
    }

    try {
      const client = createXiansClient()
      await client.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/logo`,
        logo,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json({ width: logo.width, height: logo.height })
    } catch (error) {
      return handleApiError(error, 'settings/branding/logo PUT', {
        fallbackMessage: 'Failed to update logo',
      })
    }
  }
)

/**
 * DELETE /api/settings/branding/logo
 * Remove the current tenant's logo.
 */
export const DELETE = withTenantAdmin(
  async (_request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const client = createXiansClient()
      await client.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/logo`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      return handleApiError(error, 'settings/branding/logo DELETE', {
        fallbackMessage: 'Failed to remove logo',
      })
    }
  }
)
