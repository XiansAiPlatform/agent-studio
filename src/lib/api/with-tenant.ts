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
import { requireParticipantAdmin, requireTenantAdmin, requireSystemAdmin } from "@/lib/api/auth"

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
 * Extract tenant ID from request cookie (injected from session context).
 * Use this for routes that must NOT receive tenant ID from the frontend.
 */
export function getTenantIdFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CURRENT_TENANT_COOKIE)?.value ?? null
}

/**
 * Defense-in-depth guard for cookie-scoped routes.
 *
 * These routes ALWAYS resolve tenant (and user) identity server-side from the
 * session + httpOnly `current-tenant-id` cookie. A client must never attempt to
 * supply tenant identity via the query string, a request header, or the JSON
 * body — any such attempt is rejected outright so it can never be silently
 * trusted by a future handler change.
 *
 * The body is inspected on a clone so the handler can still read it normally.
 * Both JSON and form-encoded (urlencoded / multipart) bodies are inspected so a
 * `tenantId` can't be smuggled by simply changing the Content-Type. Bodies we
 * cannot parse (e.g. arbitrary text/binary) carry no addressable `tenantId`
 * field for a handler to read, so they are ignored.
 *
 * @returns a 400 NextResponse if client-supplied identity is detected, else null
 */
export async function rejectClientTenantId(
  request: NextRequest
): Promise<NextResponse | null> {
  const message =
    'tenantId must not be supplied by the client; it is resolved server-side from the session cookie'

  // 1. Query string
  if (request.nextUrl.searchParams.has('tenantId')) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 2. Request header (clients must not pin the upstream tenant header)
  if (request.headers.get('x-tenant-id')) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // 3. Request body — peek via a clone so the handler can still read the
  //    original. Cover both JSON and form-encoded bodies: keying only off
  //    `application/json` would let a client resend `tenantId` as form data
  //    under a different Content-Type and bypass this guard.
  const method = request.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    const contentType = request.headers.get('content-type') ?? ''
    try {
      if (contentType.includes('application/json')) {
        const body = await request.clone().json()
        if (body && typeof body === 'object' && 'tenantId' in body) {
          return NextResponse.json({ error: message }, { status: 400 })
        }
      } else if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
      ) {
        const form = await request.clone().formData()
        if (form.has('tenantId')) {
          return NextResponse.json({ error: message }, { status: 400 })
        }
      }
    } catch {
      // Unparseable / empty body — nothing to reject.
    }
  }

  return null
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
      // Tenant is resolved server-side only — reject any client-supplied identity.
      const identityError = await rejectClientTenantId(request)
      if (identityError) return identityError

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
        session.accessToken,
        session.user.email
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
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for API routes that require the `settings:view` capability
 * (TenantUser / TenantParticipantAdmin / TenantAdmin, or system admin).
 *
 * Use for Agent Settings operations AND for tenant-wide workspace management that
 * a plain TenantParticipant must never reach by manipulating the frontend/URL:
 * agent activations (create/update/activate/deactivate), knowledge CRUD,
 * schedules, webhooks, tenant stats, and task review actions. Extends
 * withTenantFromSession with a capability check.
 *
 * SECURITY: The tenant is ALWAYS resolved from the server-side httpOnly
 * `current-tenant-id` cookie. Clients must never supply a tenantId in query
 * params or request body — any such value is explicitly rejected below.
 *
 * @param handler - API route handler function
 * @returns Wrapped route handler with tenant and participant admin validation
 */
export function withParticipantAdmin(handler: ApiHandler) {
  return async (request: NextRequest) => {
    try {
      // Reject any client-supplied tenantId (query/header/body) — tenant must come
      // from the server-side cookie only.
      const identityError = await rejectClientTenantId(request)
      if (identityError) return identityError

      const session = await getServerSession(authOptions)

      if (!session || !session.user?.id || !session.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      const tenantId = getTenantIdFromCookie(request)

      const authError = await requireParticipantAdmin(session, tenantId)
      if (authError) return authError

      const tenantProvider = useTenantProvider()
      const tenantContext = await tenantProvider.getTenantContext(
        session.user.id,
        tenantId!,
        session.accessToken,
        session.user.email
      )

      if (!tenantContext) {
        return NextResponse.json(
          { error: 'Access denied to this tenant' },
          { status: 403 }
        )
      }

      return handler(request, {
        session,
        tenantContext,
        tenantId: tenantId!,
      })
    } catch (error) {
      console.error('[withParticipantAdmin] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware wrapper for API routes that require TenantAdmin (or system admin).
 * Use for tenant user-management operations (/api/settings/users/*).
 *
 * SECURITY: Same cookie-only tenant resolution as withParticipantAdmin.
 * TenantParticipantAdmin and TenantUser are NOT allowed here.
 *
 * @param handler - API route handler function
 * @returns Wrapped route handler with strict tenant admin validation
 */
export function withTenantAdmin(handler: ApiHandler) {
  return async (request: NextRequest) => {
    try {
      const identityError = await rejectClientTenantId(request)
      if (identityError) return identityError

      const session = await getServerSession(authOptions)

      if (!session || !session.user?.id || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const tenantId = getTenantIdFromCookie(request)

      const authError = await requireTenantAdmin(session, tenantId)
      if (authError) return authError

      const tenantProvider = useTenantProvider()
      const tenantContext = await tenantProvider.getTenantContext(
        session.user.id,
        tenantId!,
        session.accessToken,
        session.user.email
      )

      if (!tenantContext) {
        return NextResponse.json(
          { error: 'Access denied to this tenant' },
          { status: 403 }
        )
      }

      return handler(request, { session, tenantContext, tenantId: tenantId! })
    } catch (error) {
      console.error('[withTenantAdmin] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Context provided to system-admin-protected route handlers.
 * System admin operations are cross-tenant, so no tenant context is included.
 */
export interface SystemAdminContext {
  /** NextAuth session with augmented user properties */
  session: Session
}

/**
 * Middleware wrapper for API routes that require system administrator access.
 *
 * Verifies the *current end user* is a system admin via a fresh backend lookup
 * (not the session cache, and not the service API key identity). This is the
 * authoritative authorization gate for system-admin operations — the backend
 * AdminApi endpoints resolve roles from the service API key owner, so per-user
 * enforcement MUST happen here rather than in client pages.
 *
 * @param handler - API route handler function
 * @returns Wrapped route handler with system admin validation
 *
 * @example
 * export const GET = withSystemAdmin(async (request, { session }) => {
 *   // Only reached when the current user is a verified system admin
 * })
 */
export function withSystemAdmin(
  handler: (request: NextRequest, context: SystemAdminContext) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      const session = await getServerSession(authOptions)

      const authError = await requireSystemAdmin(session)
      if (authError) return authError

      return handler(request, { session: session! })
    } catch (error) {
      console.error('[withSystemAdmin] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

