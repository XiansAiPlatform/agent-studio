import { useState, useEffect, useRef } from 'react';
import { ActivationOption } from '@/components/features/conversations';
import { useResolvedLoading } from '@/hooks/use-resolved-loading';

export function useActivations(tenantId: string | null) {
  const [activations, setActivations] = useState<ActivationOption[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const { isLoading, resolve } = useResolvedLoading(tenantId);

  useEffect(() => {
    const fetchActivations = async () => {
      if (!tenantId) {
        return;
      }

      const requestId = ++requestIdRef.current;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      
      try {
        const response = await fetch(
          `/api/agent-activations`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch activations');
        }

        const data = await response.json();
        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }

        const activationsList = Array.isArray(data) ? data : [];

        const mappedActivations: ActivationOption[] = activationsList.map((activation: any) => ({
          id: activation.id,
          name: activation.name,
          agentName: activation.agentName,
          status: activation.isActive ? 'active' : 'inactive',
          description: activation.description,
        }));

        setActivations(mappedActivations);
        resolve(tenantId);
      } catch (err) {
        if (
          requestId !== requestIdRef.current ||
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          console.log('[useActivations] Request aborted');
          return;
        }
        
        console.error('[useActivations] Error fetching activations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setActivations([]);
        resolve(tenantId);
      }
    };

    fetchActivations();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId, resolve]);

  return { activations, isLoading, error };
}
