export interface TenantBranding {
  /** The tenant's color theme id, or null when using the application default. */
  theme: string | null
  /** Logo metadata, or null when no logo is set. */
  logo: { width: number | null; height: number | null } | null
}

export interface SaveLogoRequest {
  /** External image URL. Mutually exclusive with imgBase64. */
  url?: string
  /** Base64-encoded image (data-URL prefix is allowed and stripped server-side). */
  imgBase64?: string
  width: number
  height: number
}
