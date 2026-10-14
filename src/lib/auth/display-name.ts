/**
 * Session display name.
 *
 * The name stored on the Xians user is the one admins set and the one every
 * directory uses. The identity-provider name is only a fallback for accounts
 * that have no stored name yet. Login never writes the provider name back.
 */

import { createXiansClient, XiansApiError } from '@/lib/xians/client'

export interface DisplayNameToken {
  name?: string | null
  email?: string | null
  /**
   * Identity-provider name captured at sign-in.
   * `undefined` means it has not been captured yet. `null` means the provider
   * sent no name, so a later refresh must not treat the stored name as one.
   */
  providerName?: string | null
}

/** Stored name when the directory has exactly one account for this email. */
export type StoredNameLookup =
  | { status: 'found'; name: string }
  | { status: 'fallback' }
  | { status: 'unchanged' }

function trimmed(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Prefer the stored name, then the provider name, then the email.
 * Returns null when every candidate is blank.
 */
export function chooseDisplayName(input: {
  storedName?: string | null
  providerName?: string | null
  email?: string | null
}): string | null {
  for (const candidate of [input.storedName, input.providerName, input.email]) {
    const name = trimmed(candidate)
    if (name) return name
  }
  return null
}

/**
 * Keep the provider name from the first time we see this token.
 * Call this before replacing `token.name` with the stored name.
 */
export function rememberProviderName(token: DisplayNameToken): void {
  if (token.providerName !== undefined) return
  const current = trimmed(token.name)
  token.providerName = current || null
}

/**
 * Pick the stored name for `email` from a user-list page.
 * A partial search hit is not a match. More than one exact email match is
 * left unchanged — the same address can belong to more than one account.
 */
export function classifyStoredName(
  users: Array<{ email?: string | null; name?: string | null }>,
  email: string
): StoredNameLookup {
  const target = email.trim().toLowerCase()
  if (!target) return { status: 'unchanged' }

  const matches = users.filter(
    (user) => trimmed(user.email).toLowerCase() === target
  )
  if (matches.length > 1) return { status: 'unchanged' }
  if (matches.length === 0) return { status: 'fallback' }

  const name = trimmed(matches[0].name)
  if (!name) return { status: 'fallback' }
  return { status: 'found', name }
}

function readListedUser(raw: unknown): { email: string; name: string } {
  const user = (raw ?? {}) as Record<string, unknown>
  const email = user.email
  const name = user.name
  return {
    email: typeof email === 'string' ? email : '',
    name: typeof name === 'string' ? name : '',
  }
}

/**
 * Look up the stored name with the service credential. Does not modify the user.
 *
 * Search is the primary lookup because the session id is the identity-provider
 * subject, not the Xians user id. When search misses, try the email as a user
 * id — local accounts and some imported accounts use the address as their id.
 * A 404 there means there is no stored name, not a failed lookup.
 */
export async function fetchStoredDisplayName(email: string): Promise<StoredNameLookup> {
  const client = createXiansClient()
  const trimmedEmail = email.trim()
  const data = await client.get<{ users?: unknown[] }>(
    `/api/v1/admin/users?page=1&pageSize=20&search=${encodeURIComponent(trimmedEmail)}`
  )
  const fromSearch = classifyStoredName(
    (data.users ?? []).map(readListedUser),
    trimmedEmail
  )
  if (fromSearch.status !== 'fallback') return fromSearch

  try {
    const user = await client.get<unknown>(
      `/api/v1/admin/users/${encodeURIComponent(trimmedEmail)}`
    )
    return classifyStoredName([readListedUser(user)], trimmedEmail)
  } catch (error) {
    if (error instanceof XiansApiError && error.status === 404) {
      return { status: 'fallback' }
    }
    throw error
  }
}

/**
 * Set `token.name` from the Xians user record.
 * On lookup failure or an ambiguous email, the current name is left as-is.
 */
export async function applyStoredDisplayName(token: DisplayNameToken): Promise<void> {
  rememberProviderName(token)
  const email = trimmed(token.email)
  if (!email) return

  const source = await fetchStoredDisplayName(email)
  if (source.status === 'unchanged') return

  const next = chooseDisplayName({
    storedName: source.status === 'found' ? source.name : null,
    providerName: token.providerName,
    email,
  })
  if (next) token.name = next
}
