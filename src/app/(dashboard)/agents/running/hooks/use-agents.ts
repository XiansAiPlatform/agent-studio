import { useState, useEffect, useRef } from 'react';
import { Agent } from '../types';
import { AgentStatus } from '@/lib/agent-status-config';
import { showErrorToast } from '@/lib/utils/error-handler';

export function useAgents(currentTenantId: string | null) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchActivations = async () => {
    if (!currentTenantId) {
      console.log('[useAgents] No current tenant ID');
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tenants/${currentTenantId}/agent-activations`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activations');
      }

      const data = await response.json();
      console.log('[useAgents] Fetched activations:', data);

      const activations = Array.isArray(data) ? data : [];
      
      // Sort activations by creation date (newest first)
      activations.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      const mappedAgents: Agent[] = activations.map((activation: any, index: number) => {
        const variants: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];
        const variant = variants[index % variants.length];

        let status: AgentStatus = 'inactive';
        if (activation.isActive && activation.activatedAt) {
          status = 'active';
        } else if (activation.deactivatedAt) {
          status = 'inactive';
        } else {
          status = 'inactive';
        }

        const referenceDate = activation.activatedAt || activation.createdAt;
        const createdAt = new Date(referenceDate);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          id: activation.id,
          name: activation.name,
          description: activation.description || `Agent instance for ${activation.agentName}`,
          status,
          template: activation.agentName,
          uptime: status === 'active' ? `${diffHours}h ${diffMinutes}m` : undefined,
          lastActive: status !== 'active' ? (diffHours > 0 ? `${diffHours}h ago` : `${diffMinutes}m ago`) : undefined,
          tasksCompleted: 0,
          variant,
          participantId: activation.participantId,
        };
      });

      setAgents(mappedAgents);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useAgents] Request aborted');
        return;
      }
      
      console.error('[useAgents] Error fetching activations:', error);
      showErrorToast(error, 'Failed to load agent activations');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivations();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentTenantId]);

  return {
    agents,
    isLoading,
    refreshAgents: fetchActivations,
    setAgents,
  };
}
