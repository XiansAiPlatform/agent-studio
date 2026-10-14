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

/** Admin user search uses fuzzy matching; paginate before trusting a lone match. */
export const ADMIN_USER_SEARCH_PAGE_SIZE = 100
export const ADMIN_USER_SEARCH_MAX_PAGES = 50

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

/**
 * Same as {@link classifyStoredName}, but refuses a unique match when the
 * upstream search result set may be truncated (fuzzy search + pagination).
 */
export function classifyStoredNameFromSearch(
  users: Array<{ email?: string | null; name?: string | null }>,
  email: string,
  searchComplete: boolean
): StoredNameLookup {
  const result = classifyStoredName(users, email)
  if (result.status === 'found' && !searchComplete) {
    return { status: 'unchanged' }
  }
  return result
}

/** Whether the jwt callback should reload tenant membership. */
export function shouldRevalidateTenantMembership(input: {
  trigger?: string
  isStale: boolean
  email?: string | null
}): boolean {
  if (!trimmed(input.email)) return false
  return input.trigger === 'update' || input.isStale
}

/**
 * Whether the jwt callback should reload the stored display name.
 * Not run on session.update() alone — only sign-in and stale refresh.
 */
export function shouldRefreshStoredDisplayName(input: {
  hasSignInUser: boolean
  isStale: boolean
  email?: string | null
}): boolean {
  if (!trimmed(input.email)) return false
  return input.hasSignInUser || input.isStale
}

/** Copy a non-empty token name onto the session user object. */
export function sessionNameFromToken(
  tokenName: unknown,
  currentSessionName?: string | null
): string | null | undefined {
  if (typeof tokenName === 'string' && tokenName.trim()) {
    return tokenName
  }
  return currentSessionName
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

type AdminUserListPage = {
  users?: unknown[]
  totalCount?: number
  pageSize?: number
  pagination?: { hasNext?: boolean }
}

function adminUserSearchHasNext(data: AdminUserListPage, batchLength: number): boolean {
  if (data.pagination?.hasNext === true) return true
  if (data.pagination?.hasNext === false) return false
  const pageSize = data.pageSize ?? ADMIN_USER_SEARCH_PAGE_SIZE
  return batchLength >= pageSize
}

async function fetchAllSearchMatches(
  email: string
): Promise<{
  users: Array<{ email: string; name: string }>
  searchComplete: boolean
}> {
  const client = createXiansClient()
  const trimmedEmail = email.trim()
  const collected: Array<{ email: string; name: string }> = []
  let page = 1
  let totalCount: number | undefined
  let searchComplete = false

  for (let guard = 0; guard < ADMIN_USER_SEARCH_MAX_PAGES; guard++) {
    const data = await client.get<AdminUserListPage>(
      `/api/v1/admin/users?page=${page}&pageSize=${ADMIN_USER_SEARCH_PAGE_SIZE}&search=${encodeURIComponent(trimmedEmail)}`
    )
    const batch = (data.users ?? []).map(readListedUser)

    if (typeof data.totalCount === 'number') {
      totalCount = data.totalCount
    }

    if (batch.length === 0) {
      searchComplete =
        totalCount === undefined ? true : collected.length >= totalCount
      break
    }

    collected.push(...batch)

    const target = trimmedEmail.toLowerCase()
    const exactMatches = collected.filter(
      (user) => trimmed(user.email).toLowerCase() === target
    )
    if (exactMatches.length > 1) {
      return { users: collected, searchComplete: true }
    }

    const hasNext = adminUserSearchHasNext(data, batch.length)
    if (totalCount !== undefined) {
      searchComplete = collected.length >= totalCount
    } else {
      searchComplete = !hasNext
    }

    if (searchComplete) break
    page++
  }

  return { users: collected, searchComplete }
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
  const trimmedEmail = email.trim()
  const { users, searchComplete } = await fetchAllSearchMatches(trimmedEmail)
  const fromSearch = classifyStoredNameFromSearch(users, trimmedEmail, searchComplete)
  if (fromSearch.status !== 'fallback') return fromSearch

  const client = createXiansClient()
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
