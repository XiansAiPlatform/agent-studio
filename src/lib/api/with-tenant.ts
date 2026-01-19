import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { useTenantProvider, TenantContext } from "@/lib/tenant"

export interface ApiContext {
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>
  tenantContext: TenantContext
  tenantId: string
}

export type ApiHandler = (
  request: NextRequest, 
  context: ApiContext
) => Promise<Response>

function extractTenantIdFromPath(pathname: string): string | null {
  // Match pattern: /api/tenants/{tenantId}/...
  const match = pathname.match(/\/api\/tenants\/([^\/]+)/)
  return match ? match[1] : null
}

export function withTenant(handler: ApiHandler) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const url = new URL(request.url)
    const tenantId = extractTenantIdFromPath(url.pathname)
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found in URL path' }, 
        { status: 400 }
      )
    }
    
    const tenantProvider = useTenantProvider()
    const tenantContext = await tenantProvider.getTenantContext(
      session.user.id,
      tenantId,
      session.accessToken
    )
    
    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Access denied to this tenant' }, 
        { status: 403 }
      )
    }
    
    return handler(request, { session, tenantContext, tenantId })
  }
}

export function withTenantPermission(
  requiredPermission: string,
  handler: ApiHandler
) {
  return withTenant(async (request, context) => {
    if (!context.tenantContext.permissions.includes(requiredPermission)) {
      return NextResponse.json(
        { error: `Permission denied: ${requiredPermission} required` },
        { status: 403 }
      )
    }
    return handler(request, context)
  })
}
