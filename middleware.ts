import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Public paths that don't require tenant validation
    const publicPaths = ['/login', '/enable-tenant', '/settings/tenant']
    const isPublicPath = publicPaths.some(p => path.startsWith(p))

    if (isPublicPath) {
      return NextResponse.next()
    }

    // For all other protected routes, user just needs to be authenticated
    // Tenant validation happens client-side for better UX
    // (allows showing loading states, better error messages, etc.)
    
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
  ]
}
