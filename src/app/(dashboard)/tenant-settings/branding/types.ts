export interface BrandingImageMeta {
  width: number | null
  height: number | null
}

export interface TenantBranding {
  /** The tenant's color theme, or null when it uses the default theme. */
  theme: string | null
  /** The logo's size, or null when there is no logo. */
  logo: BrandingImageMeta | null
  /** The favicon's size, or null when there is no favicon. */
  favicon: BrandingImageMeta | null
}

/** What we send to save a logo or favicon. */
export interface SaveImageRequest {
  /** A link to an image on another site. Send this or imgBase64, not both. */
  url?: string
  /** The uploaded image as base64 text. A `data:image/...;base64,` start is fine; the server removes it. */
  imgBase64?: string
  width: number
  height: number
}

export type BrandingImageKind = 'logo' | 'favicon'
