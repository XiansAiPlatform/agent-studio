/**
 * URL safety helpers used to validate user-supplied URLs before they are
 * embedded in redirects or used to construct outbound requests.
 */

/**
 * Hostnames that should never be reachable from a server-driven OAuth flow:
 * - cloud-provider instance metadata endpoints (AWS / Azure / GCP / Alibaba)
 * - loopback / link-local addresses
 * - common internal-only TLDs
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
])

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.local',
  '.internal',
  '.lan',
  '.intranet',
  '.localdomain',
]

/** Returns true if the given host is an IPv4 literal in a private/reserved range. */
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const parts = m.slice(1, 5).map((p) => Number(p))
  if (parts.some((p) => p < 0 || p > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  // 10.0.0.0/8
  if (a === 10) return true
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true
  // 169.254.0.0/16 (link-local incl. cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true
  // 0.0.0.0/8
  if (a === 0) return true
  // 100.64.0.0/10 (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

/** Returns true if the given host is an IPv6 literal that should be blocked. */
function isPrivateIPv6(host: string): boolean {
  // URL hostnames keep IPv6 literals wrapped in brackets; strip them.
  const stripped = host.startsWith('[') && host.endsWith(']')
    ? host.slice(1, -1)
    : host
  const lower = stripped.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  // Unique local addresses fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  // Link-local fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') ||
      lower.startsWith('fea') || lower.startsWith('feb')) return true
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the embedded IPv4
  const v4mapped = lower.match(/^::ffff:([0-9.]+)$/)
  if (v4mapped && isPrivateIPv4(v4mapped[1])) return true
  return false
}

export interface UrlValidationOptions {
  /** Required URL protocol (defaults to https only). */
  allowedProtocols?: string[]
  /** Required path suffix. Useful for endpoints like .well-known discovery URLs. */
  requiredPathSuffix?: string
  /** Maximum URL length. */
  maxLength?: number
}

export interface UrlValidationResult {
  ok: boolean
  reason?: string
  url?: URL
}

/**
 * Validate a URL provided by an end user. Rejects:
 *  - non-https schemes (unless overridden)
 *  - URLs longer than `maxLength`
 *  - blocked / loopback / link-local / private hostnames and IPs
 *  - URLs whose path does not end with the required suffix (when set)
 */
export function validateExternalUrl(
  raw: unknown,
  options: UrlValidationOptions = {}
): UrlValidationResult {
  const {
    allowedProtocols = ['https:'],
    requiredPathSuffix,
    maxLength = 2048,
  } = options

  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, reason: 'URL is required' }
  }
  if (raw.length > maxLength) {
    return { ok: false, reason: `URL exceeds maximum length of ${maxLength}` }
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'URL is not well-formed' }
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      ok: false,
      reason: `URL must use one of: ${allowedProtocols.join(', ')}`,
    }
  }

  const host = parsed.hostname.toLowerCase()
  if (!host) {
    return { ok: false, reason: 'URL is missing a hostname' }
  }
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: 'URL host is not allowed' }
  }
  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { ok: false, reason: 'URL host is not allowed' }
  }
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) {
    return { ok: false, reason: 'URL host resolves to a private address' }
  }

  if (requiredPathSuffix && !parsed.pathname.endsWith(requiredPathSuffix)) {
    return {
      ok: false,
      reason: `URL path must end with "${requiredPathSuffix}"`,
    }
  }

  return { ok: true, url: parsed }
}

/**
 * Validate an OIDC issuer's `.well-known/openid-configuration` URL supplied by
 * a tenant administrator. Used as defense-in-depth before string-replacing it
 * into an authorization URL the user will be redirected to.
 */
export function validateWellKnownUrl(raw: unknown): UrlValidationResult {
  return validateExternalUrl(raw, {
    allowedProtocols: ['https:'],
    requiredPathSuffix: '/.well-known/openid-configuration',
    maxLength: 2048,
  })
}
