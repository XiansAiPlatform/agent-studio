import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/messaging/files/[fileId]
 *
 * Streams a stored message file attachment back to the browser. Tenant is resolved
 * server-side from the session cookie; the file is fetched from the Xians Admin API
 * (which enforces tenant isolation on the stored GridFS metadata).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantId }: ApiContext) => {
    try {
      // Extract the fileId from the path: /api/messaging/files/{fileId}
      const segments = request.nextUrl.pathname.split('/')
      const fileId = segments[segments.length - 1]

      if (!fileId) {
        return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
      }

      const baseUrl = process.env.XIANS_SERVER_URL
      const apiKey = process.env.XIANS_APIKEY
      if (!baseUrl || !apiKey) {
        return NextResponse.json(
          { error: 'Server messaging configuration is missing' },
          { status: 500 }
        )
      }

      const url = `${baseUrl.replace(/\/$/, '')}/api/v1/admin/tenants/${encodeURIComponent(
        tenantId
      )}/messaging/files/${encodeURIComponent(fileId)}`

      const upstream = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!upstream.ok || !upstream.body) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: upstream.status === 404 ? 404 : upstream.status || 502 }
        )
      }

      const headers = new Headers()
      const contentType = upstream.headers.get('content-type')
      if (contentType) headers.set('Content-Type', contentType)
      const contentLength = upstream.headers.get('content-length')
      if (contentLength) headers.set('Content-Length', contentLength)
      const contentDisposition = upstream.headers.get('content-disposition')
      if (contentDisposition) headers.set('Content-Disposition', contentDisposition)
      // Attachments are per-user/tenant; never cache in shared/proxy caches.
      headers.set('Cache-Control', 'private, no-store')

      return new NextResponse(upstream.body, { status: 200, headers })
    } catch (error) {
      return handleApiError(error)
    }
  }
)
