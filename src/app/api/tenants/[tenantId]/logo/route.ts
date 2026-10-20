import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { unauthorizedError } from '@/lib/api/error-handler'
import { runWithSessionOnBehalfOf } from '@/lib/xians/on-behalf-of'
import { proxyTenantImage } from '@/lib/tenant/image-proxy'

/**
 * GET /api/tenants/[tenantId]/logo
 *
 * Sends a tenant's logo to the browser. The access check and caching are in
 * `@/lib/tenant/image-proxy`.
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
    return proxyTenantImage('logo', request, tenantId, session)
  })
}
