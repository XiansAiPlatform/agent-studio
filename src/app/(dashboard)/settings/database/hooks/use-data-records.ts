'use client';

import { useState, useEffect } from 'react';
import { DataResponse } from '../types';
import { showErrorToast } from '@/lib/utils/error-handler';

export function useDataRecords(
  tenantId: string | null,
  agentName: string | null,
  activationName: string | null,
  dataType: string | null,
  startDate: string,
  endDate: string,
  skip: number = 0,
  limit: number = 100,
  shouldFetch: boolean = false
) {
  const [data, setData] = useState<DataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !agentName || !activationName || !dataType || !shouldFetch || !startDate || !endDate) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const fetchRecords = async () => {
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
        });

        if (activationName) {
          params.set('activationName', activationName);
        }

        const response = await fetch(
          `/api/tenants/${tenantId}/data?${params.toString()}`
        );

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
        console.error('[useDataRecords] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setData(null);
        showErrorToast(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [tenantId, agentName, activationName, dataType, startDate, endDate, skip, limit, shouldFetch]);

  return { data, isLoading, error };
}