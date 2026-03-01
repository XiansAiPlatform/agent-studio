import { useState, useEffect, useRef } from 'react';
import { ActivationOption } from '@/components/features/conversations';

export function useActivations(tenantId: string | null) {
  const [activations, setActivations] = useState<ActivationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchActivations = async () => {
      if (!tenantId) {
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/agent-activations`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch activations');
        }

        const data = await response.json();
        const activationsList = Array.isArray(data) ? data : [];

        const mappedActivations: ActivationOption[] = activationsList.map((activation: any) => ({
          id: activation.id,
          name: activation.name,
          agentName: activation.agentName,
          status: activation.isActive ? 'active' : 'inactive',
          description: activation.description,
        }));

        setActivations(mappedActivations);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useActivations] Request aborted');
          return;
        }
        
        console.error('[useActivations] Error fetching activations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setActivations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId]);

  return { activations, isLoading, error };
}
