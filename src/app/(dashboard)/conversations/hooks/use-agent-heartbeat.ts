'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseAgentHeartbeatParams {
  tenantId: string | null;
  agentName: string | null;
  activationName: string | null;
  /** Only check heartbeat when activation is active (worker expected to run) */
  enabled?: boolean;
  /** Interval in seconds for periodic heartbeat checks. Default 30. Set to 0 to disable. */
  intervalSeconds?: number;
}

export interface UseAgentHeartbeatResult {
  /** true = worker available, false = worker not available, null = not yet checked / loading */
  workerAvailable: boolean | null;
  /** true when API/server unreachable (network error, 5xx). Distinct from worker unavailable. */
  serverUnavailable: boolean;
  isLoading: boolean;
  /** Refetch heartbeat (e.g. when user returns to tab or activation) */
  refetch: () => void;
}

/**
 * Checks agent worker liveness via heartbeat endpoint when a new activation is opened.
 * Returns worker availability to show Live tag or warning in the conversation header.
 */
export function useAgentHeartbeat({
  tenantId,
  agentName,
  activationName,
  enabled = true,
  intervalSeconds = 30,
}: UseAgentHeartbeatParams): UseAgentHeartbeatResult {
  const [workerAvailable, setWorkerAvailable] = useState<boolean | null>(null);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkHeartbeat = useCallback(
    async (background = false) => {
      if (!tenantId || !agentName || !activationName || !enabled) {
        if (!background) {
          setWorkerAvailable(null);
          setServerUnavailable(false);
        }
        return;
      }

      if (!background) {
        setIsLoading(true);
        setWorkerAvailable(null);
        setServerUnavailable(false);
      }

      try {
        const params = new URLSearchParams({
          agentName,
          activationName,
          timeoutSeconds: '5',
        });
        const res = await fetch(`/api/heartbeat?${params.toString()}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          // 5xx, 4xx, etc. - server/API error
          setServerUnavailable(true);
          setWorkerAvailable(false);
        } else {
          const data = await res.json().catch(() => ({}));
          setServerUnavailable(false);
          setWorkerAvailable(data?.available === true);
        }
      } catch {
        // Network error, connection refused, etc.
        setServerUnavailable(true);
        setWorkerAvailable(false);
      } finally {
        if (!background) setIsLoading(false);
      }
    },
    [tenantId, agentName, activationName, enabled]
  );

  // Refetch for manual trigger (user click) - shows loading state
  const refetch = useCallback(() => checkHeartbeat(false), [checkHeartbeat]);

  // Initial check when activation changes
  useEffect(() => {
    checkHeartbeat(false);
  }, [checkHeartbeat]);

  // Periodic checks (background, no loading state)
  useEffect(() => {
    if (!enabled || !tenantId || !agentName || !activationName || intervalSeconds <= 0) {
      return;
    }
    const id = setInterval(() => checkHeartbeat(true), intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [checkHeartbeat, enabled, tenantId, agentName, activationName, intervalSeconds]);

  return {
    workerAvailable,
    serverUnavailable,
    isLoading,
    refetch,
  };
}
