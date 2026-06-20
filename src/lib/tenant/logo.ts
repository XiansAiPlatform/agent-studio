/**
 * Tenant logo helpers.
 *
 * The backend serves tenant logos from an authenticated admin endpoint and now
 * returns a `logo.url` pointing at it (e.g. http://backend/api/v1/admin/tenants/{id}/logo)
 * instead of inlining the base64 payload. That URL cannot be used directly by
 * the browser/`next/image`: the host is not same-origin (so it would need to be
 * whitelisted in `next.config`) and the endpoint requires the service API key
 * the browser does not have.
 *
 * Instead we expose the logo through a same-origin proxy route
 * (`/api/tenants/{id}/logo`) that injects the service credentials server-side.
 * Same-origin URLs are accepted by `next/image` without extra configuration.
 */

export interface XiansLogo {
  url?: string | null
  imgBase64?: string | null
  width?: number
  height?: number
}

/**
 * Same-origin proxy path that streams a tenant's logo via the Next.js server.
 */
export function tenantLogoProxyUrl(tenantId: string): string {
  return `/api/tenants/${encodeURIComponent(tenantId)}/logo`
}

/**
 * Normalise a raw logo from the Xians API into one safe to hand to `next/image`.
 *
 * - Inline base64 logos are kept as-is (rendered as a `data:` URL by consumers).
 * - URL-based logos are rewritten to the same-origin proxy path, regardless of
 *   whether the backend URL is the admin endpoint or an external image URL.
 * - When no logo is present, `undefined` is returned so consumers fall back to
 *   the default icon.
 */
export function proxyTenantLogo(
  tenantId: string,
  logo: XiansLogo | null | undefined
): XiansLogo | undefined {
  if (!logo) return undefined

  if (logo.imgBase64) {
    return logo
  }

  if (logo.url) {
    return { ...logo, url: tenantLogoProxyUrl(tenantId) }
  }

  return undefined
}
