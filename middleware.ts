import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasCapability } from "@/lib/auth/capabilities"
import { getCapabilitiesFromToken } from "@/lib/auth/server-capabilities"

const CURRENT_TENANT_COOKIE = 'current-tenant-id'

async function canAccessSettings(
  token: { email?: string | null; accessToken?: string } | null,
  tenantId: string | null
): Promise<boolean> {
  if (!tenantId) return false
  const capabilities = await getCapabilitiesFromToken(token, tenantId)
  return hasCapability(capabilities, 'settings:view')
}

async function canAccessSystemAdmin(
  token: { email?: string | null; accessToken?: string } | null
): Promise<boolean> {
  const capabilities = await getCapabilitiesFromToken(token, null)
  return hasCapability(capabilities, 'system:admin')
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
