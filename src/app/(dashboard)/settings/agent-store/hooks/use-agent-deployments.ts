import { useState, useEffect, useRef } from 'react';
import { XiansAgentDeployment } from '@/lib/xians/types';
import { EnhancedDeployment } from '../types';
import { getAgentIcon, getAgentColor } from '../utils/agent-helpers';
import { showErrorToast } from '@/lib/utils/error-handler';
import { useTenant } from '@/hooks/use-tenant';

export const useAgentDeployments = () => {
  // Tenant is resolved server-side from the session cookie; the current
  // selection only gates whether we fetch and triggers a refetch on change.
  const { currentTenantId } = useTenant();
  const [deployedAgents, setDeployedAgents] = useState<EnhancedDeployment[]>([]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchKey = currentTenantId;
  // True while tenant is missing or this tenant's fetch has not resolved yet.
  const isLoading = fetchKey == null || resolvedKey !== fetchKey;

  useEffect(() => {
    async function fetchDeployments() {
      if (!currentTenantId) return;

      const key = currentTenantId;
      
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      try {
        setError(null);
        
        const deploymentsRes = await fetch(`/api/agent-deployments`, {
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
        setResolvedKey(key);
      } catch (err) {
        // Ignore abort errors — do not resolve the key so loading stays true
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useAgentDeployments] Request aborted');
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
        setError(errorMessage);
        showErrorToast(err, 'Failed to load agents');
        setResolvedKey(key);
      }
    }

    fetchDeployments();

    // Cleanup function to abort request if component unmounts or tenant changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentTenantId]);

  return { 
    deployedAgents, 
    isLoading, 
    error,
  };
};
