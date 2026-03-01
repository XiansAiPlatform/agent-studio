/**
 * Tenant-aware API Route Wrapper
 * 
 * Provides middleware functionality for API routes that require:
 * - Authentication (via NextAuth session)
 * - Tenant context and validation
 * - Permission checking
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { useTenantProvider, TenantContext } from "@/lib/tenant"

/**
 * API Context provided to route handlers
 * Contains authenticated session and tenant information
 */
export interface ApiContext {
  /** NextAuth session with augmented user properties */
  session: Session
  /** Validated tenant context */
  tenantContext: TenantContext
  /** Tenant ID from route parameters */
  tenantId: string
}

/**
 * API Route Handler type
 * Handlers receive request and context, return a Response
 */
export type ApiHandler = (
  request: NextRequest, 
  context: ApiContext
) => Promise<Response>

/** Cookie name for current tenant (server-side only, httpOnly) */
export const CURRENT_TENANT_COOKIE = 'current-tenant-id'

/**
 * Extract tenant ID from URL pathname
 * @param pathname - Request pathname
 * @returns Tenant ID or null if not found
 */
function extractTenantIdFromPath(pathname: string): string | null {
  // Match pattern: /api/tenants/{tenantId}/...
  const match = pathname.match(/\/api\/tenants\/([^\/]+)/)
  return match ? match[1] : null
}

/**
 * Extract tenant ID from request cookie (injected from session context).
 * Use this for routes that must NOT receive tenant ID from the frontend.
 */
function getTenantIdFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CURRENT_TENANT_COOKIE)?.value ?? null
}

/**
 * Middleware wrapper for tenant-aware API routes
 * 
 * Validates:
 * - User has valid authentication session
 * - Tenant ID is present in URL
 * - User has access to the specified tenant
 * 
 * @param handler - API route handler function
 * @returns Wrapped route handler with tenant validation
 * 
 * @example
 * export const GET = withTenant(async (request, context) => {
 *   const { session, tenantContext, tenantId } = context
 *   // session.user.id, session.accessToken are fully typed
 *   // ...
 * })
 */
export function withTenant(handler: ApiHandler) {
  return async (request: NextRequest) => {
    try {
      // Get authenticated session
      const session = await getServerSession(authOptions)
      
      // Validate session exists and has required properties
      if (!session || !session.user?.id || !session.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      // Extract tenant ID from URL
      const url = new URL(request.url)
      const tenantId = extractTenantIdFromPath(url.pathname)
      
      if (!tenantId) {
        return NextResponse.json(
          { error: 'Tenant ID not found in URL path' },
          { status: 400 }
        )
      }
      
      // Validate tenant access
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
      
      // Call handler with validated context
      return handler(request, { session, tenantContext, tenantId })
    } catch (error) {
      console.error('[withTenant] Error:', error)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for tenant-aware API routes that inject tenant from session.
 * 
 * Does NOT accept tenant ID from the frontend. Instead, gets tenant from the
 * httpOnly current-tenant-id cookie (set via POST /api/user/current-tenant).
 * 
 * Use for routes that follow the architecture rule: "Presentation layer must not
 * pass the tenant id to Next.js api routes."
 * 
 * @param handler - API route handler function
 * @returns Wrapped route handler with tenant from session
 */
export function withTenantFromSession(handler: ApiHandler) {
  return async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)
      
      if (!session || !session.user?.id || !session.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      
      const tenantId = getTenantIdFromCookie(request)
      
      if (!tenantId) {
        return NextResponse.json(
          { error: 'No tenant selected. Please select a tenant in the dashboard.' },
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
    } catch (error) {
      console.error('[withTenantFromSession] Error:', error)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for permission-protected API routes
 * 
 * Extends withTenant with additional permission checking
 * 
 * @param requiredPermission - Permission string required to access the route
 * @param handler - API route handler function
 * @returns Wrapped route handler with tenant and permission validation
 * 
 * @example
 * export const DELETE = withTenantPermission(
 *   'admin',
 *   async (request, context) => {
 *     // Only users with 'admin' permission can access
 *     // ...
 *   }
 * )
 */
export function withTenantPermission(
  requiredPermission: string,
  handler: ApiHandler
) {
  return withTenant(async (request, context) => {
    // Check if user has required permission
    if (!context.tenantContext.permissions.includes(requiredPermission)) {
      return NextResponse.json(
        { 
          error: `Permission denied: ${requiredPermission} required`,
          requiredPermission,
          userPermissions: context.tenantContext.permissions
        },
        { status: 403 }
      )
    }
    return handler(request, context)
  })
}
