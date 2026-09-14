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
 * Encode a name for use as a URL path segment (`Kjøpsassistent` →
 * `Kj%C3%B8psassistent`). Decodes first so already-encoded params are not
 * double-encoded.
 */
export function encodeAgentNamePath(name: string): string {
  return encodeURIComponent(decodeAgentNameParam(name))
}

export function isValidAgentName(name: string): boolean {
  const normalized = normalizeAgentName(name)
  return normalized.length > 0 && AGENT_NAME_PATTERN.test(normalized)
}

export function agentNamesEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a == null || b == null) return a === b
  return decodeAgentNameParam(a) === decodeAgentNameParam(b)
}
