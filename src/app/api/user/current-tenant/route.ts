import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { useTenantProvider } from '@/lib/tenant'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

/**
 * POST /api/user/current-tenant
 * Set the current tenant for the authenticated user (server-side context).
 * The tenant ID is stored in an httpOnly cookie and injected into API routes
 * that use withTenantFromSession - never passed from frontend to those routes.
 *
 * Body: { tenantId: string }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const tenantId = body?.tenantId

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    const tenantProvider = useTenantProvider()
    const tenantContext = await tenantProvider.getTenantContext(
      session.user.id,
      tenantId,
      (session as any).accessToken
    )

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Access denied to this tenant' },
        { status: 403 }
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(CURRENT_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('[Current Tenant API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
