import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LogsResponse, LogFilters } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

interface UseLogsResult {
  logs: LogsResponse['logs'];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useLogs(
  tenantId: string | null,
  filters: LogFilters,
  enabled: boolean = true
): UseLogsResult {
  const [logs, setLogs] = useState<LogsResponse['logs']>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to store current filters without causing re-renders
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Create a stable key from filters to prevent infinite loops
  const filtersKey = useMemo(() => JSON.stringify(filters), [
    filters.agentName,
    filters.activationName,
    filters.workflowId,
    filters.workflowType,
    filters.logLevel?.join(','),
    filters.startDate,
    filters.endDate,
    filters.pageSize,
    filters.page,
  ]);

  const fetchLogs = useCallback(async () => {
    if (!tenantId || !enabled) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the ref to get current filters
      const currentFilters = filtersRef.current;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (currentFilters.agentName) params.set('agentName', currentFilters.agentName);
      if (currentFilters.activationName) params.set('activationName', currentFilters.activationName);
      if (currentFilters.workflowId) params.set('workflowId', currentFilters.workflowId);
      if (currentFilters.workflowType) params.set('workflowType', currentFilters.workflowType);
      
      // Handle multiple log levels (comma-separated)
      if (currentFilters.logLevel && currentFilters.logLevel.length > 0) {
        params.set('logLevel', currentFilters.logLevel.join(','));
      }
      
      if (currentFilters.startDate) params.set('startDate', currentFilters.startDate);
      if (currentFilters.endDate) params.set('endDate', currentFilters.endDate);
      
      params.set('pageSize', (currentFilters.pageSize || 20).toString());
      params.set('page', (currentFilters.page || 1).toString());

      const apiUrl = `/api/tenants/${tenantId}/logs?${params.toString()}`;
      console.log('[useLogs] Fetching logs from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include cookies for authentication
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch logs';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `Failed to fetch logs: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: LogsResponse = await response.json();
      console.log('[useLogs] Fetched logs:', {
        count: data.logs.length,
        totalCount: data.totalCount,
        page: data.page,
        totalPages: data.totalPages,
      });

      setLogs(data.logs);
      setTotalCount(data.totalCount);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[useLogs] Error fetching logs:', error);
      setError(error);
      // Only show toast if it's not a network error during initial load
      if (error.message !== 'Failed to fetch') {
        showErrorToast(error, 'Failed to load logs');
      }
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, enabled, filtersKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    totalCount,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    refetch: fetchLogs,
  };
}
