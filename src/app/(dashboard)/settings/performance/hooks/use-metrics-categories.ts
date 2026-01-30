'use client';

import { useState, useEffect } from 'react';
import { MetricsCategoriesResponse } from '../types';

export function useMetricsCategories(
  tenantId: string | null,
  startDate: string,
  endDate: string,
  agentName?: string | null,
  activationName?: string | null,
  shouldFetch: boolean = true
) {
  const [data, setData] = useState<MetricsCategoriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !shouldFetch || !startDate || !endDate) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
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
          `/api/tenants/${tenantId}/metrics/categories?${params.toString()}`
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
      } catch (err) {
        console.error('[useMetricsCategories] Error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [tenantId, startDate, endDate, agentName, activationName, shouldFetch]);

  return { data, isLoading, error };
}
