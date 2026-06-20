/**
 * Short-TTL request memoization for Xians upstream lookups.
 *
 * A single browser page refresh fans out into many independent Next.js
 * requests (middleware + several API routes), each of which resolves tenant
 * identity by calling the upstream Xians admin API. Those lookups
 * (participant tenants, tenant-by-id, all-tenants) are pure functions of their
 * arguments — the upstream client always authenticates with the service API
 * key, never the end user's token — so their results can be safely shared
 * across users for a short window.
 *
 * This cache provides two things:
 *  1. In-flight de-duplication: concurrent callers for the same key share a
 *     single upstream promise (the dominant win during a refresh burst).
 *  2. Short TTL caching: results are reused for `ttlMs` so back-to-back
 *     requests don't re-hit upstream.
 *
 * The TTL is intentionally short because these lookups back the authorization
 * gate; a revoked role/permission becomes visible after at most `ttlMs`.
 */

interface CacheEntry<T> {
  expiresAt: number
  promise: Promise<T>
}

export interface TtlCache<T> {
  /** Return the cached/in-flight value for `key`, or run `loader` and cache it. */
  get(key: string, loader: () => Promise<T>): Promise<T>
  /** Remove a single key (e.g. after a mutation invalidates it). */
  delete(key: string): void
  /** Clear the entire cache. */
  clear(): void
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  const store = new Map<string, CacheEntry<T>>()

  return {
    get(key, loader) {
      const now = Date.now()
      const existing = store.get(key)
      if (existing && existing.expiresAt > now) {
        return existing.promise
      }

      const promise = loader()
      store.set(key, { expiresAt: now + ttlMs, promise })

      // Never cache failures: evict the entry if the loader rejects so the next
      // caller retries upstream instead of replaying the error for the full TTL.
      promise.catch(() => {
        const current = store.get(key)
        if (current && current.promise === promise) {
          store.delete(key)
        }
      })

      return promise
    },
    delete(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

/**
 * Default TTL for tenant/participant lookups. Short enough to keep
 * authorization data fresh, long enough to collapse a page-refresh burst.
 */
export const TENANT_LOOKUP_TTL_MS = 10_000
