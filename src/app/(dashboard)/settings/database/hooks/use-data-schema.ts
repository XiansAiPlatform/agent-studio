'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DataSchemaResponse } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

export function useDataSchema(
  agentName: string | null,
  activationName: string | null,
  startDate: string,
  endDate: string,
  shouldFetch: boolean = false,
  refreshNonce: number = 0
) {
  const [data, setData] = useState<DataSchemaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSchema = useCallback(async (signal?: AbortSignal) => {
    if (!agentName || !activationName || !shouldFetch || !startDate || !endDate) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        activationName,
      });

      const response = await fetch(`/api/data/schema?${params.toString()}`, { signal });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch data schema';
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
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('[useDataSchema] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setData(null);
      showErrorToast(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [agentName, activationName, startDate, endDate, shouldFetch]);

  useEffect(() => {
    if (!agentName || !activationName || !shouldFetch || !startDate || !endDate) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    void fetchSchema(abortControllerRef.current.signal);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [agentName, activationName, shouldFetch, startDate, endDate, fetchSchema, refreshNonce]);

  return { data, isLoading, error, refetch: fetchSchema };
}
