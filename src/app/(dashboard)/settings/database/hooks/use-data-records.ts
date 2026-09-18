'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DataResponse } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

export function useDataRecords(
  agentName: string | null,
  activationName: string | null,
  dataType: string | null,
  startDate: string,
  endDate: string,
  skip: number = 0,
  limit: number = 100,
  shouldFetch: boolean = false,
  refreshNonce: number = 0
) {
  const [data, setData] = useState<DataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRecords = useCallback(async (signal?: AbortSignal) => {
    if (!agentName || !activationName || !dataType || !shouldFetch || !startDate || !endDate) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        agentName,
        dataType,
        skip: skip.toString(),
        limit: limit.toString(),
        activationName,
      });

      const response = await fetch(`/api/data?${params.toString()}`, { signal });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch data records';
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
      console.error('[useDataRecords] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setData(null);
      showErrorToast(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [
    agentName,
    activationName,
    dataType,
    startDate,
    endDate,
    skip,
    limit,
    shouldFetch,
  ]);

  useEffect(() => {
    if (!agentName || !activationName || !dataType || !shouldFetch || !startDate || !endDate) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    void fetchRecords(abortControllerRef.current.signal);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [
    agentName,
    activationName,
    dataType,
    shouldFetch,
    startDate,
    endDate,
    fetchRecords,
    refreshNonce,
  ]);

  return { data, isLoading, error, refetch: fetchRecords };
}
