/**
 * Helpers for the tenant favicon.
 *
 * A tenant admin can upload a favicon under Tenant Settings → Branding. If there
 * is none, the tenant logo is used. If there is no logo either, the default
 * Agent Studio icon is used.
 */

/** The default Agent Studio icon, in the `public/` folder. */
export const DEFAULT_FAVICON = '/logo.svg'

/**
 * Returns the Agent Studio URL for a tenant's favicon. With `fallbackToLogo`, a
 * tenant without a favicon gets its logo instead of the default icon.
 * `version` is added to the URL so the browser loads a fresh copy after a change.
 */
export function tenantFaviconProxyUrl(
  tenantId: string,
  options: { fallbackToLogo?: boolean; version?: number } = {}
): string {
  const params = new URLSearchParams()
  if (options.fallbackToLogo) params.set('fallback', 'logo')
  if (options.version) params.set('v', String(options.version))
  const query = params.toString()
  return `/api/tenants/${encodeURIComponent(tenantId)}/favicon${query ? `?${query}` : ''}`
}
