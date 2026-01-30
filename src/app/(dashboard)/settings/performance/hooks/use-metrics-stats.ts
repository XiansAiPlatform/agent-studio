'use client';

import { useState, useEffect } from 'react';
import { MetricStatsResponse } from '../types';

export function useMetricsStats(
  tenantId: string | null,
  agentName: string | null,
  activationName: string | null,
  startDate: string,
  endDate: string,
  shouldFetch: boolean = false
) {
  const [data, setData] = useState<MetricStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !shouldFetch || !startDate || !endDate) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        if (agentName) {
          params.set('agentName', agentName);
        }
        if (activationName) {
          params.set('activationName', activationName);
        }

        const response = await fetch(
          `/api/tenants/${tenantId}/metrics/stats?${params.toString()}`
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch metrics stats';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('[useMetricsStats] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [tenantId, agentName, activationName, startDate, endDate, shouldFetch]);

  return { data, isLoading, error };
}
