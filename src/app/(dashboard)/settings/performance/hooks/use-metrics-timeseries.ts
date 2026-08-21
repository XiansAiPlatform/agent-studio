'use client';

import { useState, useEffect } from 'react';
import { MetricTimeseriesResponse } from '../types';
import { useResolvedLoading } from '@/hooks/use-resolved-loading';

export function useMetricsTimeseries(
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
  const [error, setError] = useState<string | null>(null);
  const fetchKey =
    shouldFetch && startDate && endDate && category && type
      ? `${category}:${type}:${startDate}:${endDate}:${agentName ?? ''}:${activationName ?? ''}:${groupBy}`
      : null;
  const { isLoading, resolve } = useResolvedLoading(fetchKey, false);

  useEffect(() => {
    if (!shouldFetch || !startDate || !endDate || !category || !type) {
      setData(null);
      return;
    }

    const key = `${category}:${type}:${startDate}:${endDate}:${agentName ?? ''}:${activationName ?? ''}:${groupBy}`;

    const fetchTimeseries = async () => {
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
          `/api/metrics/timeseries?${params.toString()}`
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
        resolve(key);
      } catch (err) {
        console.error('[useMetricsTimeseries] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
        resolve(key);
      }
    };

    fetchTimeseries();
  }, [category, type, startDate, endDate, agentName, activationName, groupBy, shouldFetch]);

  return { data, isLoading, error };
}
