'use client';

import { useState, useEffect, useRef } from 'react';
import { DataSchemaResponse } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

export function useDataSchema(
  tenantId: string | null,
  agentName: string | null,
  activationName: string | null,
  startDate: string,
  endDate: string,
  shouldFetch: boolean = false
) {
  const [data, setData] = useState<DataSchemaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[useDataSchema] Effect triggered:', {
      tenantId,
      agentName,
      activationName,
      shouldFetch,
      startDate: startDate?.substring(0, 10),
      endDate: endDate?.substring(0, 10)
    });

    if (!tenantId || !agentName || !activationName || !shouldFetch || !startDate || !endDate) {
      console.log('[useDataSchema] Skipping fetch - missing required params');
      setData(null);
      setIsLoading(false);
      return;
    }

    // Create a unique key for these parameters
    const paramsKey = `${tenantId}-${agentName}-${activationName}-${startDate}-${endDate}`;
    
    // Skip if we already fetched with these exact parameters
    if (lastFetchParamsRef.current === paramsKey) {
      console.log('[useDataSchema] Skipping fetch - already fetched with these params');
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const fetchSchema = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          agentName,
          activationName,
        });

        const response = await fetch(
          `/api/tenants/${tenantId}/data/schema?${params.toString()}`,
          {
            signal: abortControllerRef.current!.signal,
          }
        );

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
        
        // Mark these parameters as fetched
        lastFetchParamsRef.current = paramsKey;
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useDataSchema] Request aborted');
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
    };

    fetchSchema();

    // Cleanup function to abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId, agentName, activationName, startDate, endDate, shouldFetch]);

  return { data, isLoading, error };
}