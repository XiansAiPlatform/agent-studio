import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { encodeSafePathSegment } from '@/lib/api/path-segment'
import { handleApiError } from '@/lib/api/error-handler'
import { xiansAdminHeaders } from '@/lib/xians/client'

/**
 * GET /api/messaging/files/[fileId]
 *
 * Streams a stored message file attachment back to the browser. Tenant is resolved
 * server-side from the session cookie; the file is fetched from the Xians Admin API
 * (which enforces tenant isolation on the stored GridFS metadata).
 */
export const GET = withTenantFromSession(
  async (_request: NextRequest, { tenantId, params }: ApiContext<{ fileId: string }>) => {
    try {
      const fileId = encodeSafePathSegment(params.fileId)
      if (!fileId) {
        return NextResponse.json(
          { error: 'fileId is required and must be a valid identifier' },
          { status: 400 }
        )
      }

      const baseUrl = process.env.XIANS_SERVER_URL
      if (!baseUrl || !process.env.XIANS_APIKEY) {
        return NextResponse.json(
          { error: 'Server messaging configuration is missing' },
          { status: 500 }
        )
      }

      const url = `${baseUrl.replace(/\/$/, '')}/api/v1/admin/tenants/${encodeURIComponent(
        tenantId
      )}/messaging/files/${fileId}`

      const upstream = await fetch(url, {
        method: 'GET',
        headers: xiansAdminHeaders(),
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
