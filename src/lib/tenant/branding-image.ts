/**
 * Checks a logo or favicon before it is saved. The backend stores both the same
 * way, so the same rules apply to both.
 */

// The same limits as the backend. Checking here first gives the user a clear
// error message instead of a confusing one from the server.
const MAX_BASE64_LENGTH = 1_000_000
const MAX_URL_LENGTH = 500
const MIN_DIMENSION = 1
const MAX_DIMENSION = 10000

export interface BrandingImage {
  url?: string
  imgBase64?: string
  width: number
  height: number
}

/**
 * Removes the `data:image/...;base64,` start of the text, if there is one. The
 * backend only accepts the base64 part.
 */
function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',')
  return value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value
}

function isValidDimension(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_DIMENSION &&
    value <= MAX_DIMENSION
  )
}

/**
 * Checks a `{ url?, imgBase64?, width, height }` request body. Returns the
 * cleaned-up image, or an error message to send back with status 400.
 * `label` ("Logo" or "Favicon") is used in error messages.
 */
export function parseBrandingImage(
  body: unknown,
  label: string
): { image: BrandingImage; error?: undefined } | { image?: undefined; error: string } {
  const { url, imgBase64, width, height } = (body ?? {}) as Record<string, unknown>

  const hasUrl = typeof url === 'string' && url.trim() !== ''
  const hasBase64 = typeof imgBase64 === 'string' && imgBase64.trim() !== ''

  if (hasUrl === hasBase64) {
    return { error: 'Provide exactly one of url or imgBase64' }
  }

  if (!isValidDimension(width) || !isValidDimension(height)) {
    return {
      error: `width and height must be integers between ${MIN_DIMENSION} and ${MAX_DIMENSION}`,
    }
  }

  const image: BrandingImage = { width, height }

  if (hasUrl) {
    const trimmed = (url as string).trim()
    if (trimmed.length > MAX_URL_LENGTH) {
      return { error: `${label} URL cannot exceed ${MAX_URL_LENGTH} characters` }
    }
    image.url = trimmed
  } else {
    const base64 = stripDataUrlPrefix((imgBase64 as string).trim())
    if (base64.length > MAX_BASE64_LENGTH) {
      return { error: 'Image is too large. Please use an image under ~700KB.' }
    }
    image.imgBase64 = base64
  }

  return { image }
}
