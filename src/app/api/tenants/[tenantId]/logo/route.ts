import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { unauthorizedError } from '@/lib/api/error-handler'

/**
 * GET /api/tenants/[tenantId]/logo
 *
 * Same-origin proxy for a tenant's logo. The backend serves logos from an
 * authenticated admin endpoint; the browser cannot call it directly (cross-origin
 * + requires the service API key). This route injects the service credentials
 * server-side and streams the image back, so `next/image` can load it without
 * host whitelisting.
 *
 * Caching is layered:
 * - A small in-process cache (keyed by tenantId) avoids re-hitting the backend
 *   on every request, including across users, for the TTL below.
 * - A strong `ETag` lets browsers revalidate cheaply with `If-None-Match` and
 *   get a `304` once their `max-age` window lapses.
 */

interface CachedLogo {
  body: Buffer
  contentType: string
  etag: string
  expiresAt: number
}

// Module-level cache. In `output: 'standalone'` (long-running Node server) this
// persists across requests. Tenant counts are small and logos tiny, so a plain
// Map with TTL pruning is sufficient.
const logoCache = new Map<string, CachedLogo>()
const LOGO_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const LOGO_CACHE_MAX_ENTRIES = 100
// Browser cache window; ETag handles revalidation once this lapses.
const BROWSER_MAX_AGE_SECONDS = 3600

function getFreshCached(tenantId: string): CachedLogo | null {
  const cached = logoCache.get(tenantId)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    logoCache.delete(tenantId)
    return null
  }
  return cached
}

function setCached(tenantId: string, entry: CachedLogo): void {
  // Opportunistically prune expired entries / enforce a soft cap to bound memory.
  if (logoCache.size >= LOGO_CACHE_MAX_ENTRIES) {
    const now = Date.now()
    for (const [key, value] of logoCache) {
      if (value.expiresAt <= now) logoCache.delete(key)
    }
    if (logoCache.size >= LOGO_CACHE_MAX_ENTRIES) {
      const oldest = logoCache.keys().next().value
      if (oldest !== undefined) logoCache.delete(oldest)
    }
  }
  logoCache.set(tenantId, entry)
}

function buildImageResponse(
  entry: CachedLogo,
  ifNoneMatch: string | null
): NextResponse {
  const headers = {
    'Content-Type': entry.contentType,
    'Cache-Control': `private, max-age=${BROWSER_MAX_AGE_SECONDS}, stale-while-revalidate=86400`,
    ETag: entry.etag,
  }

  // Browser already has this exact image — let it reuse its copy.
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    return new NextResponse(null, { status: 304, headers })
  }

  return new NextResponse(entry.body, { status: 200, headers })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return unauthorizedError()
  }

  const { tenantId } = await context.params
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
  }

  const ifNoneMatch = request.headers.get('if-none-match')

  const cached = getFreshCached(tenantId)
  if (cached) {
    return buildImageResponse(cached, ifNoneMatch)
  }

  const baseUrl = process.env.XIANS_SERVER_URL
  const apiKey = process.env.XIANS_APIKEY
  if (!baseUrl || !apiKey) {
    console.error('[Tenant Logo Proxy] Missing XIANS_SERVER_URL or XIANS_APIKEY')
    return NextResponse.json({ error: 'Server is misconfigured' }, { status: 500 })
  }

  const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/logo`

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // External-URL logos are served by the backend as a redirect to the source
      // image; follow it so we always return image bytes from this origin.
      redirect: 'follow',
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Logo not found' },
        { status: upstream.status === 404 ? 404 : 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const body = Buffer.from(await upstream.arrayBuffer())
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`

    const entry: CachedLogo = {
      body,
      contentType,
      etag,
      expiresAt: Date.now() + LOGO_CACHE_TTL_MS,
    }
    setCached(tenantId, entry)

    return buildImageResponse(entry, ifNoneMatch)
  } catch (error) {
    console.error('[Tenant Logo Proxy] Failed to fetch logo for tenant', tenantId, error)
    return NextResponse.json({ error: 'Failed to fetch logo' }, { status: 502 })
  }
}
