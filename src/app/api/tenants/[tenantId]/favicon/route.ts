import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { runWithSessionOnBehalfOf } from '@/lib/xians/on-behalf-of'
import { proxyTenantImage } from '@/lib/tenant/image-proxy'
import { DEFAULT_FAVICON } from '@/lib/tenant/favicon'

/**
 * GET /api/tenants/[tenantId]/favicon
 *
 * Sends the icon for a tenant's browser tab. The access check and caching are
 * in `@/lib/tenant/image-proxy`.
 *
 * It returns the tenant's favicon, or its logo if there is no favicon. If the
 * tenant has neither, or the icon can't be shown (not logged in, no access to
 * the tenant, backend error), it redirects to the default icon (`public/logo.svg`).
 * The tab always gets an icon.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user?.email) {
    return defaultIcon()
  }

  return runWithSessionOnBehalfOf(session, async () => {
    const { tenantId } = await context.params
    const response = await proxyTenantImage(['favicon', 'logo'], request, tenantId, session)
    // 200 = image, 304 = the browser's copy is still current.
    if (response.status === 200 || response.status === 304) {
      return response
    }
    return defaultIcon()
  })
}

/**
 * Redirects to the default icon file. The page (FaviconUpdater) sees the
 * redirect and then links to the default icon file directly, which is what
 * browsers reliably accept as a tab icon.
 */
function defaultIcon(): NextResponse {
  // Use a path without the host name, so the redirect still works behind a
  // reverse proxy. `no-store` stops the browser from keeping the default icon
  // after a favicon or logo is added.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: DEFAULT_FAVICON, 'Cache-Control': 'no-store' },
  })
}
