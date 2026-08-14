'use client';

import { useState, useEffect } from 'react';
import { MetricsCategoriesResponse } from '../types';
import { useResolvedLoading } from '@/hooks/use-resolved-loading';

export function useMetricsCategories(
  startDate: string,
  endDate: string,
  agentName?: string | null,
  activationName?: string | null,
  shouldFetch: boolean = true
) {
  const [data, setData] = useState<MetricsCategoriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchKey =
    shouldFetch && startDate && endDate
      ? `${startDate}:${endDate}:${agentName ?? ''}:${activationName ?? ''}`
      : null;
  const { isLoading, resolve } = useResolvedLoading(fetchKey, false);

  useEffect(() => {
    if (!shouldFetch || !startDate || !endDate) {
      setData(null);
      return;
    }

    const key = `${startDate}:${endDate}:${agentName ?? ''}:${activationName ?? ''}`;

    const fetchCategories = async () => {
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        // Add optional filters
        if (agentName) {
          params.set('agentName', agentName);
        }
        if (activationName) {
          params.set('activationName', activationName);
        }

        const response = await fetch(
          `/api/metrics/categories?${params.toString()}`
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch metrics categories';
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
        console.error('[useMetricsCategories] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
        resolve(key);
      }
    };

    fetchCategories();
  }, [startDate, endDate, agentName, activationName, shouldFetch]);

  return { data, isLoading, error };
}
