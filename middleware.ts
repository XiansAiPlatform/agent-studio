import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"

const CURRENT_TENANT_COOKIE = 'current-tenant-id'

// Roles that may access Agent Settings (mirrors settings/layout.tsx and
// requireParticipantAdmin). System admins are always allowed.
const AGENT_SETTINGS_ROLES = new Set([
  'TenantAdmin',
  'TenantParticipantAdmin',
  'TenantUser',
])

async function canAccessSettings(
  token: { email?: string | null; accessToken?: string } | null,
  tenantId: string | null
): Promise<boolean> {
  if (!token?.email) return false
  if (!tenantId) return false

  try {
    const client = createXiansClient(token.accessToken as string)
    const tenantsApi = new XiansTenantsApi(client)
    const response = await tenantsApi.getParticipantTenants(token.email)
    // System admins have access to settings for any tenant.
    if (response.isSystemAdmin) return true
    const currentTenant = response.tenants.find((t) => t.tenantId === tenantId)
    return AGENT_SETTINGS_ROLES.has(currentTenant?.role ?? '')
  } catch {
    return false
  }
}

async function canAccessSystemAdmin(
  token: { email?: string | null; accessToken?: string } | null
): Promise<boolean> {
  if (!token?.email) return false

  try {
    const client = createXiansClient(token.accessToken as string)
    const tenantsApi = new XiansTenantsApi(client)
    const response = await tenantsApi.getParticipantTenants(token.email)
    return response.isSystemAdmin === true
  } catch {
    return false
  }
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Public paths that don't require tenant validation
    const publicPaths = ['/login', '/no-access', '/enable-tenant']
    const isPublicPath = publicPaths.some(p => path.startsWith(p))

    if (isPublicPath) {
      return NextResponse.next()
    }

    // Settings paths require TenantParticipantAdmin (or system admin)
    if (path.startsWith('/settings')) {
      const tenantId = req.cookies.get(CURRENT_TENANT_COOKIE)?.value ?? null
      const allowed = await canAccessSettings(token, tenantId)
      if (!allowed) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
      }
    }

    // System admin paths require the user to be a platform system administrator
    if (path.startsWith('/system-admin')) {
      const allowed = await canAccessSystemAdmin(token)
      if (!allowed) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
      }
    }

    // For all other protected routes, user just needs to be authenticated
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/conversations/:path*",
    "/tasks/:path*",
    "/knowledge/:path*",
    "/enable-tenant",
    "/settings/:path*",
    "/system-admin/:path*",
  ]
}
