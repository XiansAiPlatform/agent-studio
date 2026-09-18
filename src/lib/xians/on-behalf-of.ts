/**
 * Request-scoped UI user for Admin API audit attribution.
 *
 * Agent Studio authenticates to Xians Admin API with the shared service key.
 * `X-On-Behalf-Of` tells the server which Studio UI user triggered the call so
 * audit rows record that person instead of the API-key owner.
 *
 * This is attribution, not impersonation: it does not change permissions and
 * is not a substitute for the user's OIDC token on WebAPI.
 *
 * The identity is always the user's email — the same value the BFF already
 * sends as `participantId` and as the `userId` that backend ownership checks
 * are keyed on — so audit rows correlate with the rest of the platform.
 */

import { AsyncLocalStorage } from 'async_hooks'

export const ON_BEHALF_OF_HEADER = 'X-On-Behalf-Of'

const onBehalfOfStore = new AsyncLocalStorage<string>()

/**
 * Run `fn` with the UI user bound for nested Admin API calls.
 *
 * The outermost identity wins: a nested scope for a *different* user (e.g. a
 * system admin resolving another user's roles) must not overwrite the actor who
 * actually made the request.
 */
export function runWithOnBehalfOf<T>(
  userId: string | null | undefined,
  fn: () => T
): T {
  const id = typeof userId === 'string' ? userId.trim() : ''
  if (!id) return fn()
  if (onBehalfOfStore.getStore()) return fn()
  return onBehalfOfStore.run(id, fn)
}

export function runWithSessionOnBehalfOf<T>(
  session: { user?: { email?: string | null } } | null | undefined,
  fn: () => T
): T {
  return runWithOnBehalfOf(session?.user?.email, fn)
}

export function getOnBehalfOf(): string | undefined {
  return onBehalfOfStore.getStore()
}

/**
 * Set `X-On-Behalf-Of` on an outgoing Admin API request.
 *
 * Any value already on `headers` is discarded first, so attribution can never be
 * spoofed by a call site passing its own header. `fallback` is used only when no
 * request scope is available (e.g. Edge middleware).
 */
export function applyOnBehalfOfHeader(
  headers: Record<string, string>,
  fallback?: string
): void {
  delete headers['x-on-behalf-of']
  delete headers[ON_BEHALF_OF_HEADER]

  const userId = getOnBehalfOf() ?? fallback
  if (userId) {
    headers[ON_BEHALF_OF_HEADER] = userId
  }
}
