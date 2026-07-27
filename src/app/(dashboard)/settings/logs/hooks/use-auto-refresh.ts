import { useEffect, useState } from 'react';

const AUTO_REFRESH_INTERVAL_MS = 10_000;
const AUTO_REFRESH_SECONDS = AUTO_REFRESH_INTERVAL_MS / 1000;
// Auto-refresh is automatically turned off after this duration so an idle
// open tab does not keep polling the server indefinitely.
const AUTO_REFRESH_MAX_DURATION_MS = 15 * 60 * 1000;
const AUTO_REFRESH_MAX_MINUTES = AUTO_REFRESH_MAX_DURATION_MS / 60_000;

interface UseAutoRefreshResult {
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  /** Increments on every refresh tick; views watch this to trigger a refetch. */
  refreshTick: number;
  /** Briefly true right after each tick, purely for a "Refreshing…" visual flash. */
  isRefreshing: boolean;
  intervalSeconds: number;
  maxDurationMinutes: number;
}

/**
 * Drives the "Live" auto-refresh toggle on the logs page: fires `refreshTick`
 * every `AUTO_REFRESH_INTERVAL_MS` while enabled, auto-stops after
 * `AUTO_REFRESH_MAX_DURATION_MS`, and exposes a short-lived `isRefreshing`
 * flag for visual feedback on each tick.
 */
export function useAutoRefresh(enabled: boolean): UseAutoRefreshResult {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const intervalId = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    const stopId = setTimeout(() => {
      setAutoRefresh(false);
    }, AUTO_REFRESH_MAX_DURATION_MS);

    return () => {
      clearInterval(intervalId);
      clearTimeout(stopId);
    };
  }, [autoRefresh, enabled]);

  // Briefly flash a "Refreshing…" state each time a refresh fires. Purely
  // visual feedback; decoupled from the actual fetch lifecycle.
  useEffect(() => {
    if (refreshTick === 0) return;
    setIsRefreshing(true);
    const id = setTimeout(() => setIsRefreshing(false), 1200);
    return () => clearTimeout(id);
  }, [refreshTick]);

  return {
    autoRefresh,
    toggleAutoRefresh: () => setAutoRefresh((v) => !v),
    refreshTick,
    isRefreshing,
    intervalSeconds: AUTO_REFRESH_SECONDS,
    maxDurationMinutes: AUTO_REFRESH_MAX_MINUTES,
  };
}
