import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { forbiddenError, unauthorizedError } from '@/lib/api/error-handler'
import { getTenantProvider } from '@/lib/tenant'
import { xiansAdminHeaders } from '@/lib/xians/client'

/**
 * Serves a tenant's logo or favicon to the browser.
 *
 * The backend only gives these images to callers that have the service API
 * key, and the browser must never see that key. So this code fetches the image
 * on the server, adds the key there, and passes the image on to the browser.
 *
 * There are two caches:
 * - The server keeps each image in memory for 5 minutes, so it doesn't ask the
 *   backend again on every page load. Saving or removing an image clears it
 *   straight away (see `invalidateTenantImage`).
 * - The browser keeps the image for 1 hour. After that it asks again, and if
 *   the image hasn't changed the server just replies "not modified" (304).
 */

export type TenantImageKind = 'logo' | 'favicon'

interface CachedImage {
  body: Buffer
  contentType: string
  etag: string
  expiresAt: number
}

// In-memory cache. It lives as long as the server process does. There are few
// tenants and the images are small, so a simple Map is enough.
const imageCache = new Map<string, CachedImage>()
const IMAGE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const IMAGE_CACHE_MAX_ENTRIES = 200
// How long the browser may reuse an image before asking again.
const BROWSER_MAX_AGE_SECONDS = 3600

function cacheKey(kind: TenantImageKind, tenantId: string): string {
  return `${kind}:${tenantId}`
}

function getFreshCached(key: string): CachedImage | null {
  const cached = imageCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    imageCache.delete(key)
    return null
  }
  return cached
}

function setCached(key: string, entry: CachedImage): void {
  // When the cache is full, remove expired images first, then the oldest one.
  if (imageCache.size >= IMAGE_CACHE_MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, value] of imageCache) {
      if (value.expiresAt <= now) imageCache.delete(k)
    }
    if (imageCache.size >= IMAGE_CACHE_MAX_ENTRIES) {
      const oldest = imageCache.keys().next().value
      if (oldest !== undefined) imageCache.delete(oldest)
    }
  }
  imageCache.set(key, entry)
}

/** Remove an image from the cache, so the next request gets the new one. */
export function invalidateTenantImage(kind: TenantImageKind, tenantId: string): void {
  imageCache.delete(cacheKey(kind, tenantId))
}

function buildImageResponse(
  entry: CachedImage,
  ifNoneMatch: string | null
): NextResponse {
  const headers = {
    'Content-Type': entry.contentType,
    'Cache-Control': `private, max-age=${BROWSER_MAX_AGE_SECONDS}, stale-while-revalidate=86400`,
    ETag: entry.etag,
  }

  // The browser already has this exact image, so tell it to keep using it.
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    return new NextResponse(null, { status: 304, headers })
  }

  return new NextResponse(new Uint8Array(entry.body), { status: 200, headers })
}

interface ProxyOptions {
  /**
   * Runs when the tenant has no image of this kind. Use it to send something
   * else instead (for example, a redirect to another image) rather than a 404.
   */
  onNotFound?: (request: NextRequest, tenantId: string) => NextResponse
}

/**
 * Handles `GET /api/tenants/{tenantId}/{kind}`. Checks that the user belongs to
 * the tenant, then returns the image from the cache or from the backend.
 *
 * The route file must check the login itself and wrap the call in
 * `runWithSessionOnBehalfOf`. The script scripts/check-route-auth.mjs checks this.
 */
export async function proxyTenantImage(
  kind: TenantImageKind,
  request: NextRequest,
  tenantId: string | undefined,
  session: Session,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }
  if (!session.user?.id) {
    return unauthorizedError()
  }

  // The tenant ID comes from the URL, so anyone can change it. Check that the
  // user belongs to this tenant (or is a system admin). Otherwise a logged-in
  // user could see other tenants' images by guessing their IDs.
  const tenantContext = await getTenantProvider().getTenantContext(
    session.user.id,
    tenantId,
    (session as { accessToken?: string }).accessToken,
    session.user.email ?? undefined
  )
  if (!tenantContext) {
    return forbiddenError('Access denied to this tenant')
  }

  const ifNoneMatch = request.headers.get('if-none-match')
  const key = cacheKey(kind, tenantId)

  const cached = getFreshCached(key)
  if (cached) {
    return buildImageResponse(cached, ifNoneMatch)
  }

  const baseUrl = process.env.XIANS_SERVER_URL
  if (!baseUrl || !process.env.XIANS_APIKEY) {
    console.error(`[Tenant ${kind} Proxy] Missing XIANS_SERVER_URL or XIANS_APIKEY`)
    return NextResponse.json({ error: 'Server is misconfigured' }, { status: 500 })
  }

  const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/${kind}`

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: xiansAdminHeaders(),
      // If the image is stored as an outside URL, the backend redirects to it.
      // Follow the redirect so we always send the image itself to the browser.
      redirect: 'follow',
      cache: 'no-store',
    })

    if (upstream.status === 404 && options.onNotFound) {
      return options.onNotFound(request, tenantId)
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `${kind} not found` },
        { status: upstream.status === 404 ? 404 : 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const body = Buffer.from(await upstream.arrayBuffer())
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`

    const entry: CachedImage = {
      body,
      contentType,
      etag,
      expiresAt: Date.now() + IMAGE_CACHE_TTL_MS,
    }
    setCached(key, entry)

    return buildImageResponse(entry, ifNoneMatch)
  } catch (error) {
    console.error(`[Tenant ${kind} Proxy] Failed to fetch ${kind} for tenant`, tenantId, error)
    return NextResponse.json({ error: `Failed to fetch ${kind}` }, { status: 502 })
  }
}
