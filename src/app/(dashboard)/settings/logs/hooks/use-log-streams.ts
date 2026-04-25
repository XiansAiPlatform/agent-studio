import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { LogStream, LogStreamFilters, LogStreamsResponse } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

interface UseLogStreamsResult {
  streams: LogStream[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLogStreams(
  filters: LogStreamFilters,
  enabled: boolean = true
): UseLogStreamsResult {
  const [streams, setStreams] = useState<LogStream[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    [
      filters.agentName,
      filters.activationName,
      filters.workflowType,
      filters.logLevel?.join(','),
      filters.startDate,
      filters.endDate,
      filters.pageSize,
      filters.page,
    ]
  );

  const fetchStreams = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) {
      setStreams([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const current = filtersRef.current;
      const params = new URLSearchParams();

      if (current.agentName) params.set('agentName', current.agentName);
      if (current.activationName) params.set('activationName', current.activationName);
      if (current.workflowType) params.set('workflowType', current.workflowType);

      if (current.logLevel && current.logLevel.length > 0) {
        params.set('logLevel', current.logLevel.join(','));
      }

      if (current.startDate) params.set('startDate', current.startDate);
      if (current.endDate) params.set('endDate', current.endDate);

      params.set('pageSize', (current.pageSize || 20).toString());
      params.set('page', (current.page || 1).toString());

      const apiUrl = `/api/logs/streams?${params.toString()}`;
      console.log('[useLogStreams] Fetching streams from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch log streams';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `Failed to fetch log streams: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: LogStreamsResponse = await response.json();
      console.log('[useLogStreams] Fetched streams:', {
        count: data.streams?.length ?? 0,
        totalCount: data.totalCount,
        page: data.page,
        totalPages: data.totalPages,
      });

      setStreams(data.streams ?? []);
      setTotalCount(data.totalCount);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useLogStreams] Request aborted');
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[useLogStreams] Error fetching streams:', error);
      setError(error);
      if (error.message !== 'Failed to fetch') {
        showErrorToast(error, 'Failed to load log streams');
      }
      setStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, filtersKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStreams(controller.signal);
    return () => controller.abort();
  }, [fetchStreams]);

  return {
    streams,
    totalCount,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    refetch: () => fetchStreams(),
  };
}
