'use client';

import { useState, useEffect } from 'react';
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
          `/api/tenants/${tenantId}/data/schema?${params.toString()}`
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
      } catch (err) {
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
  }, [tenantId, agentName, activationName, startDate, endDate, shouldFetch]);

  return { data, isLoading, error };
}