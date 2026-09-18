/**
 * Request-scoped UI user for Admin API audit attribution.
 *
 * Agent Studio authenticates to Xians Admin API with the shared service key.
 * `X-On-Behalf-Of` tells the server which Studio UI user triggered the call so
 * audit rows record that person instead of the API-key owner.
 *
 * This is attribution, not impersonation: it does not change permissions and
 * is not a substitute for the user's OIDC token on WebAPI.
 */

import { AsyncLocalStorage } from 'async_hooks'

export const ON_BEHALF_OF_HEADER = 'X-On-Behalf-Of'

const onBehalfOfStore = new AsyncLocalStorage<string>()

/** Signed-in user's platform identity (email), if present. */
export function onBehalfOfFromUser(
  user?: { email?: string | null; id?: string | null } | null
): string | undefined {
  const email = user?.email?.trim()
  if (email) return email
  const id = user?.id?.trim()
  if (id) return id
  return undefined
}

/**
 * Run `fn` with the UI user bound for nested Admin API calls.
 * An outer identity (already in scope) is left unchanged.
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
  session: { user?: { email?: string | null; id?: string | null } } | null | undefined,
  fn: () => T
): T {
  return runWithOnBehalfOf(onBehalfOfFromUser(session?.user), fn)
}

export function getOnBehalfOf(): string | undefined {
  return onBehalfOfStore.getStore()
}

/** Set `X-On-Behalf-Of` from the current request scope, overwriting any prior value. */
export function applyOnBehalfOfHeader(headers: Record<string, string>): void {
  const userId = getOnBehalfOf()
  if (userId) {
    headers[ON_BEHALF_OF_HEADER] = userId
  }
}
