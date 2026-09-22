/**
 * Shared Unicode-safe agent / activation name rules.
 *
 * Matches the Xians server constant:
 *   ^[\p{L}\p{M}\p{N}\s._@|+\-:/\\,#=]+$
 *
 * Allows Norwegian letters (æ, ø, å) and combining marks, and still rejects
 * markup / injection characters (< > " ' { }). Tenant IDs stay ASCII and are
 * not validated here.
 */

/** Same character class the server uses for agent and activation names. */
export const AGENT_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\s._@|+\-:/\\,#=]+$/u

export const AGENT_NAME_MIN_LENGTH = 3
export const AGENT_NAME_MAX_LENGTH = 100

export const AGENT_NAME_VALIDATION_MESSAGE =
  'Use letters (including æ, ø, å), numbers, spaces, and . _ @ | + - : / \\ , # ='

/**
 * Canonical form for stored / compared names: NFC so composed vs decomposed å
 * (U+00E5 vs a + combining ring) match, then trim.
 */
export function normalizeAgentName(name: string): string {
  return name.normalize('NFC').trim()
}

/**
 * Decode a name taken from a route or query param.
 *
 * Next.js usually already decodes params, but client `useParams()` can still
 * yield percent-encoded values (e.g. Kj%C3%B8psassistent). `%` is not a legal
 * agent-name character, so decoding encoded forms is safe. Never throws.
 */
export function decodeAgentNameParam(
  raw: string | string[] | null | undefined
): string {
  if (raw == null) return ''
  let current = Array.isArray(raw) ? raw[0] ?? '' : String(raw)
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(current)
      if (next === current) break
      current = next
    } catch {
      break
    }
  }
  return current.normalize('NFC').trim()
}

/**
 * WHATWG special path segments. `encodeURIComponent` leaves these unchanged,
 * and `new URL(path, base)` then resolves them as relative segments — so a
 * param of `..` (or `%2e%2e`) can escape a tenant-scoped Admin API path.
 */
export function isDotPathSegment(value: string): boolean {
  return value === '.' || value === '..'
}

export class InvalidAgentNamePathError extends Error {
  readonly status = 400
  constructor(
    message = 'Agent or activation name is not a valid path segment'
  ) {
    super(message)
    this.name = 'InvalidAgentNamePathError'
  }
}

/**
 * Encode a name for use as a URL path segment (`Kjøpsassistent` →
 * `Kj%C3%B8psassistent`). Decodes first so already-encoded params are not
 * double-encoded. Rejects `.` / `..` / empty after decode so the result
 * cannot change the upstream path.
 */
export function encodeAgentNamePath(name: string): string {
  const decoded = decodeAgentNameParam(name)
  if (!decoded || isDotPathSegment(decoded)) {
    throw new InvalidAgentNamePathError()
  }
  return encodeURIComponent(decoded)
}

export function isValidAgentName(name: string): boolean {
  const normalized = normalizeAgentName(name)
  return (
    normalized.length > 0 &&
    !isDotPathSegment(normalized) &&
    AGENT_NAME_PATTERN.test(normalized)
  )
}

export function agentNamesEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a == null || b == null) return a === b
  return decodeAgentNameParam(a) === decodeAgentNameParam(b)
}
