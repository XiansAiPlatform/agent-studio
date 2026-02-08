import { useState, useEffect, useRef } from 'react';
import { XiansAgentDeployment } from '@/lib/xians/types';
import { EnhancedDeployment } from '../types';
import { getAgentIcon, getAgentColor } from '../utils/agent-helpers';
import { showErrorToast } from '@/lib/utils/error-handler';

export const useAgentDeployments = (tenantId: string | null) => {
  const [deployedAgents, setDeployedAgents] = useState<EnhancedDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchDeployments() {
      if (!tenantId) return;
      
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      try {
        setIsLoading(true);
        setError(null);
        
        const deploymentsRes = await fetch(`/api/tenants/${tenantId}/agent-deployments`, {
          signal: abortControllerRef.current.signal,
        });
        const deploymentsData = await deploymentsRes.json();
        
        if (!deploymentsRes.ok) {
          console.error('Failed to fetch deployments:', deploymentsData);
          throw new Error(deploymentsData.message || 'Failed to fetch deployments');
        }
        
        const deployments: XiansAgentDeployment[] = Array.isArray(deploymentsData?.agents) 
          ? deploymentsData.agents 
          : Array.isArray(deploymentsData) 
          ? deploymentsData
          : [];
        
        console.log('Processed deployments:', deployments);
        
        // Enhance deployments with UI metadata
        const enhancedDeployments: EnhancedDeployment[] = deployments.map(deployment => ({
          ...deployment,
          icon: getAgentIcon(deployment.name, null, deployment.description),
          color: getAgentColor(deployment.name),
          activationCount: 0, // TODO: Fetch actual activation count from API
        }));
        
        // Sort deployments by creation date (newest first)
        enhancedDeployments.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        setDeployedAgents(enhancedDeployments);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useAgentDeployments] Request aborted');
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
        setError(errorMessage);
        showErrorToast(err, 'Failed to load agents');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDeployments();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tenantId]);

  const refetch = () => {
    if (tenantId) {
      setIsLoading(true);
      // Trigger re-fetch by updating a dependency
    }
  };

  return { 
    deployedAgents, 
    isLoading, 
    error,
    refetch,
    setDeployedAgents 
  };
};
