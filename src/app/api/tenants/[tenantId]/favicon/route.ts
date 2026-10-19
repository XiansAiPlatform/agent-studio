import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { unauthorizedError } from '@/lib/api/error-handler'
import { runWithSessionOnBehalfOf } from '@/lib/xians/on-behalf-of'
import { proxyTenantImage } from '@/lib/tenant/image-proxy'
import { tenantLogoProxyUrl } from '@/lib/tenant/logo'
import { DEFAULT_FAVICON } from '@/lib/tenant/favicon'

/**
 * GET /api/tenants/[tenantId]/favicon[?fallback=logo]
 *
 * Sends a tenant's favicon to the browser. The access check and caching are in
 * `@/lib/tenant/image-proxy`.
 *
 * If the tenant has no favicon, the browser is sent to the tenant logo (when
 * the URL has `fallback=logo`) or to the default icon. These are the only two
 * places it can be sent, so nobody can use this URL to redirect to another site.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user?.email) {
    return unauthorizedError()
  }

  return runWithSessionOnBehalfOf(session, async () => {
    const { tenantId } = await context.params
    return proxyTenantImage('favicon', request, tenantId, session, {
      onNotFound: (req, id) => {
        const target =
          req.nextUrl.searchParams.get('fallback') === 'logo'
            ? tenantLogoProxyUrl(id)
            : DEFAULT_FAVICON
        // Use a path without the host name, so the redirect still works behind
        // a reverse proxy. `no-store` stops the browser from keeping the fallback
        // icon after a favicon is uploaded.
        return new NextResponse(null, {
          status: 307,
          headers: { Location: target, 'Cache-Control': 'no-store' },
        })
      },
    })
  })
}
