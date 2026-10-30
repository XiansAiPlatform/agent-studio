/**
 * Helpers for the tenant favicon.
 *
 * A tenant admin can upload a favicon under Tenant Settings → Branding. If there
 * is none, the tenant logo is used. If there is no logo either, the default
 * Agent Studio icon is used. The server makes this choice, so the browser
 * always uses the same URL for a tenant.
 */

/** The default icon, in the `public/` folder. The same as before tenant favicons (and as on studio.agentri.ai). */
export const DEFAULT_FAVICON = '/logo.svg'

/**
 * Returns the Agent Studio URL for a tenant's tab icon. `version` is added to
 * the URL so the browser loads a fresh copy after a change.
 */
export function tenantFaviconProxyUrl(
  tenantId: string,
  options: { version?: number } = {}
): string {
  const base = `/api/tenants/${encodeURIComponent(tenantId)}/favicon`
  return options.version ? `${base}?v=${options.version}` : base
}
