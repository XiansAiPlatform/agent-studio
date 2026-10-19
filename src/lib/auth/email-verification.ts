/**
 * Per-IdP "require verified email" sign-in gate (nOAuth mitigation). Studio
 * identifies users by email, and Entra lets any tenant admin set a user's email
 * to an address they do not own. See docs/auth/EMAIL_VERIFICATION.md.
 */

type Env = Record<string, string | undefined>

/** NextAuth provider id -> env var prefix. Providers not listed (e.g. `local`) are exempt. */
const PROVIDER_ENV_PREFIXES: Record<string, string> = {
  'azure-ad': 'AZURE_AD',
  'azure-ad-b2c': 'AZURE_AD_B2C',
  google: 'GOOGLE',
  keycloak: 'KEYCLOAK',
  'visma-connect': 'VISMA_CONNECT',
}

export interface ClaimCheck {
  claim: string
  value: string
}

export interface EmailVerificationPolicy {
  providerId: string
  verifyClaims: ClaimCheck[]
  trustedClaim?: string
  /** Lower-cased. */
  trustedValues: string[]
  /** Set when the env config is unusable. The provider then refuses every sign-in. */
  configError?: string
}

export interface EmailVerificationResult {
  admitted: boolean
  /** The verified address to sign the user in with. Only set when admitted via the verify claims. */
  email?: string
  reason: string
}

function parseBoolean(raw: string | undefined): boolean | undefined {
  const value = raw?.trim().toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function parseList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * The verification policy for a provider, or null when verification is not
 * required for it. Precedence: `<PREFIX>_ALLOW_UNVERIFIED_EMAIL`, then
 * `AUTH_ALLOW_UNVERIFIED_EMAIL`, then allow. Empty values count as unset.
 */
export function resolveEmailVerificationPolicy(
  providerId: string,
  env: Env = process.env
): EmailVerificationPolicy | null {
  const prefix = PROVIDER_ENV_PREFIXES[providerId]
  if (!prefix) return null

  const policy: EmailVerificationPolicy = { providerId, verifyClaims: [], trustedValues: [] }

  const switchName = [`${prefix}_ALLOW_UNVERIFIED_EMAIL`, 'AUTH_ALLOW_UNVERIFIED_EMAIL'].find(
    (name) => env[name]?.trim()
  )
  if (!switchName) return null
  const allowUnverified = parseBoolean(env[switchName])
  // A typo in the switch must not silently turn verification off.
  if (allowUnverified === undefined) {
    policy.configError = `${switchName} is "${env[switchName]}", expected true or false`
    return policy
  }
  if (allowUnverified) return null

  for (const pair of parseList(env[`${prefix}_VERIFY_CLAIMS`])) {
    // Split on the first '=' only so values may contain '='.
    const separator = pair.indexOf('=')
    const claim = separator > 0 ? pair.slice(0, separator).trim() : ''
    const value = separator > 0 ? pair.slice(separator + 1).trim() : ''
    if (!claim || !value) {
      policy.configError = `${prefix}_VERIFY_CLAIMS entry "${pair}" is not claim=value`
      return policy
    }
    policy.verifyClaims.push({ claim, value })
  }

  const trustedClaim = env[`${prefix}_TRUSTED_CLAIM`]?.trim()
  const trustedValues = parseList(env[`${prefix}_TRUSTED_VALUES`])
  if (trustedClaim && trustedValues.length > 0) {
    policy.trustedClaim = trustedClaim
    // GUIDs and domains are case-insensitive, so a pasted upper-case tenant id still matches.
    policy.trustedValues = trustedValues.map((value) => value.toLowerCase())
  }

  if (policy.verifyClaims.length === 0 && !policy.trustedClaim) {
    policy.configError = `verification is required but neither ${prefix}_VERIFY_CLAIMS nor ${prefix}_TRUSTED_CLAIM/${prefix}_TRUSTED_VALUES is set`
  }

  return policy
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === 0) return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return undefined
}

function claimMatches(actual: unknown, expected: string): boolean {
  if (Array.isArray(actual)) return actual.some((item) => claimMatches(item, expected))
  if (actual === undefined || actual === null) return false

  // IdPs disagree on whether booleans are JSON booleans or strings like "1".
  const expectedBoolean = parseBoolean(expected)
  if (expectedBoolean !== undefined) return toBoolean(actual) === expectedBoolean

  return String(actual) === expected
}

// B2C policies emit the address as `email`, `emails[]` or `signInNames.emailAddress`.
function emailClaim(claims: Record<string, unknown>): string | undefined {
  const signInNames = claims.signInNames
  const candidates = [
    claims.email,
    Array.isArray(claims.emails) ? claims.emails[0] : undefined,
    signInNames && typeof signInNames === 'object'
      ? (signInNames as Record<string, unknown>).emailAddress
      : undefined,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().toLowerCase()
  }
  return undefined
}

/** Decide whether an ID token's claims satisfy the policy. */
export function evaluateEmailVerification(
  policy: EmailVerificationPolicy,
  claims: Record<string, unknown> | null | undefined
): EmailVerificationResult {
  if (policy.configError) {
    return { admitted: false, reason: `invalid configuration: ${policy.configError}` }
  }

  const tokenClaims = claims ?? {}

  if (policy.verifyClaims.length > 0) {
    const email = emailClaim(tokenClaims)
    const failed = policy.verifyClaims.filter(
      (check) => !claimMatches(tokenClaims[check.claim], check.value)
    )
    // The verify claims describe the email claim, so the user is signed in as exactly that address.
    if (email && failed.length === 0) {
      return { admitted: true, email, reason: 'verified email' }
    }
    if (!policy.trustedClaim) {
      return {
        admitted: false,
        reason: email
          ? `claim check failed: ${failed.map((check) => check.claim).join(', ')}`
          : 'no email claim in token',
      }
    }
  }

  const actual = policy.trustedClaim ? tokenClaims[policy.trustedClaim] : undefined
  const actualValues = (Array.isArray(actual) ? actual : [actual])
    .filter((value) => typeof value === 'string')
    .map((value) => (value as string).toLowerCase())
  if (actualValues.some((value) => policy.trustedValues.includes(value))) {
    return { admitted: true, reason: `trusted ${policy.trustedClaim}` }
  }

  const emailNote = policy.verifyClaims.length > 0 ? 'email not verified and ' : ''
  return { admitted: false, reason: `${emailNote}${policy.trustedClaim} not trusted` }
}

/** Keep the domain for diagnosis without logging the full address. */
export function redactEmail(email: string | null | undefined): string {
  if (!email) return '(none)'
  const at = email.lastIndexOf('@')
  return at > 0 ? `${email[0]}***${email.slice(at)}` : '***'
}
