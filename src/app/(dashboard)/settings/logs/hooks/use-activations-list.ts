import { useEffect, useRef, useState } from 'react';
import { ActivationWithAgent } from '../types';

/**
 * Fetches the full list of agent activations once per tenant, used to
 * populate the activation-tree filter in `LogFilterSlider`. Deliberately
 * separate from `useLogStreams`/`useLogs`, which page through the log data
 * itself.
 */
export function useActivationsList(tenantId: string | null | undefined) {
  const [activations, setActivations] = useState<ActivationWithAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchActivations = async () => {
      if (!tenantId) {
        setActivations([]);
        setIsLoading(false);
        return;
      }

      if (hasFetchedRef.current) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const response = await fetch(`/api/agent-activations`, {
          signal: abortControllerRef.current.signal,
        });

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
        const activationsArray = Array.isArray(data) ? data : data.activations || [];
        const activationsWithAgents = activationsArray.map((activation: any) => ({
          activationName: activation.name,
          agentName: activation.agentName,
          isActive: activation.isActive || false,
        }));

        setActivations(activationsWithAgents);
        hasFetchedRef.current = true;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('[useActivationsList] Error fetching activations:', error);
        setActivations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId]);

  return { activations, isLoading };
}
