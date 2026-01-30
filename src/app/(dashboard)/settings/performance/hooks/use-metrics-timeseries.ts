'use client';

import { useState, useEffect } from 'react';
import { MetricTimeseriesResponse } from '../types';

export function useMetricsTimeseries(
  tenantId: string | null,
  category: string,
  type: string,
  startDate: string,
  endDate: string,
  agentName?: string | null,
  activationName?: string | null,
  groupBy: string = 'day',
  shouldFetch: boolean = true
) {
  const [data, setData] = useState<MetricTimeseriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !shouldFetch || !startDate || !endDate || !category || !type) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchTimeseries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          category,
          type,
          startDate,
          endDate,
          groupBy,
        });

        // Add optional filters
        if (agentName) {
          params.set('agentName', agentName);
        }
        if (activationName) {
          params.set('activationName', activationName);
        }

        const response = await fetch(
          `/api/tenants/${tenantId}/metrics/timeseries?${params.toString()}`
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch timeseries data';
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
        console.error('[useMetricsTimeseries] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeseries();
  }, [tenantId, category, type, startDate, endDate, agentName, activationName, groupBy, shouldFetch]);

  return { data, isLoading, error };
}
