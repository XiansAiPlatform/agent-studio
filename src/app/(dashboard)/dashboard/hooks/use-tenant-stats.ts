import { useState, useEffect } from 'react';
import { XiansTenantStats } from '@/lib/xians/types';
import { showToast } from '@/lib/toast';

export type TimePeriod = '7d' | '30d' | '90d';

const DEFAULT_STATS: XiansTenantStats = {
  tasks: { pending: 0, completed: 0, timedOut: 0, cancelled: 0, total: 0 },
  messages: { activeUsers: 0, totalMessages: 0 },
};

const DAYS_PER_PERIOD: Record<TimePeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function getDateRange(period: TimePeriod) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - DAYS_PER_PERIOD[period]);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Fetches tenant stats from the API. Tenant is resolved server-side from the
 * session cookie — the client does not pass tenantId.
 *
 * @param timePeriod - Date range filter (7d, 30d, 90d)
 * @param enabled - When false, skips fetch (e.g. before tenant is selected)
 */
export function useTenantStats(timePeriod: TimePeriod, enabled = true) {
  const [stats, setStats] = useState<XiansTenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const abortController = new AbortController();

    async function fetchStats() {
      setIsLoading(true);
      try {
        const { startDate, endDate } = getDateRange(timePeriod);
        const params = new URLSearchParams({ startDate, endDate });
        const response = await fetch(`/api/tenant-stats?${params}`, {
          signal: abortController.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch tenant stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;

        showToast.error({
          title: 'Failed to fetch tenant stats',
          description: error instanceof Error ? error.message : 'An error occurred while loading dashboard statistics',
        });
        setStats(DEFAULT_STATS);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
    return () => abortController.abort();
  }, [enabled, timePeriod]);

  return {
    stats: stats ?? DEFAULT_STATS,
    isLoading,
  };
}
