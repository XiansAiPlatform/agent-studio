'use client';

import { useState, useEffect, useRef } from 'react';

export interface Activation {
  id: string;
  name: string;
  agentName: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
}

export function useActivations(tenantId: string | null, shouldFetch: boolean = true) {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tenantId || !shouldFetch) {
      setActivations([]);
      setIsLoading(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const fetchActivations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/agent-activations`,
          {
            signal: abortControllerRef.current!.signal,
          }
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch activations';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = `Failed to fetch activations: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('[useActivations] Fetched activations:', data);

        const activationsArray = Array.isArray(data) ? data : (data.activations || []);
        const mappedActivations: Activation[] = activationsArray.map((activation: any) => ({
          id: activation.id,
          name: activation.name,
          agentName: activation.agentName,
          isActive: activation.isActive || false,
          description: activation.description,
          createdAt: activation.createdAt,
          activatedAt: activation.activatedAt,
          deactivatedAt: activation.deactivatedAt,
        }));

        setActivations(mappedActivations);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useActivations] Request aborted');
          return;
        }
        
        console.error('[useActivations] Error fetching activations:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setActivations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();

    // Cleanup function to abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId, shouldFetch]);

  return { activations, isLoading, error };
}
