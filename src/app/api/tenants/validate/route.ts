import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { useTenantProvider } from '@/lib/tenant'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'

/**
 * POST /api/tenants/validate
 * Validate if a tenant exists and the user has access. Tenant ID from body - we verify access server-side.
 * Use when switching tenants: validates before setting the current-tenant cookie.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized', exists: false, enabled: false },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const tenantId = body?.tenantId

  if (!tenantId || typeof tenantId !== 'string') {
    return NextResponse.json(
      { error: 'tenantId is required in request body', exists: false, enabled: false },
      { status: 400 }
    )
  }

  try {
    const tenantProvider = useTenantProvider()
    const tenantContext = await tenantProvider.getTenantContext(
      session.user.id,
      tenantId,
      (session as any).accessToken
    )

    if (!tenantContext) {
      return NextResponse.json({
        exists: false,
        enabled: false,
        error: 'Access denied or tenant does not exist',
      })
    }

    const xiansClient = createXiansClient((session as any).accessToken)
    const tenantsApi = new XiansTenantsApi(xiansClient)
    const tenant = await tenantsApi.getTenant(tenantId)

    return NextResponse.json({
      exists: true,
      enabled: true,
      tenant: {
        id: tenant.tenantId,
        name: tenant.name,
      },
    })
  } catch (error: any) {
    const isNotFound = error.status === 404
    return NextResponse.json({
      exists: false,
      enabled: false,
      error: isNotFound
        ? `Tenant "${tenantId}" does not exist or is disabled`
        : error.message || 'Failed to validate tenant',
    })
  }
}
