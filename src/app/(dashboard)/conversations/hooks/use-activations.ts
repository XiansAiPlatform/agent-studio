import { useState, useEffect } from 'react';
import { ActivationOption } from '@/components/features/conversations';

export function useActivations(tenantId: string | null) {
  const [activations, setActivations] = useState<ActivationOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchActivations = async () => {
      if (!tenantId) {
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/tenants/${tenantId}/agent-activations`
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
          isActive: activation.isActive,
          description: activation.description,
        }));

        setActivations(mappedActivations);
      } catch (err) {
        console.error('[useActivations] Error fetching activations:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setActivations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivations();
  }, [tenantId]);

  return { activations, isLoading, error };
}
