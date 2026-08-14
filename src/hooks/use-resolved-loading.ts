'use client';

import { useCallback, useState } from 'react';

/**
 * Loading stays true until `resolve(key)` runs for the current fetch key.
 * Aborted requests must not call resolve, so a newer in-flight fetch cannot
 * be marked done by an older request's finally block.
 *
 * @param fetchKey Current request identity. `null` means not ready to fetch.
 * @param pendingWhenNull When true (default), `null` fetchKey is treated as loading
 *   (e.g. waiting for tenant). Pass false for optional fetches.
 */
export function useResolvedLoading(fetchKey: string | null, pendingWhenNull = true) {
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const isLoading = fetchKey === null ? pendingWhenNull : resolvedKey !== fetchKey;

  const resolve = useCallback((key: string) => {
    setResolvedKey(key);
  }, []);

  return { isLoading, resolve };
}
