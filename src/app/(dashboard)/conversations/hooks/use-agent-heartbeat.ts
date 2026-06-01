'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseAgentHeartbeatParams {
  tenantId: string | null;
  agentName: string | null;
  activationName: string | null;
  /** Only check heartbeat when activation is active (worker expected to run) */
  enabled?: boolean;
  /** Starting interval in seconds. Doubles after each check up to maxIntervalSeconds. Default 30. */
  baseIntervalSeconds?: number;
  /** Maximum interval cap in seconds. Default 300 (5 min). */
  maxIntervalSeconds?: number;
}

export interface UseAgentHeartbeatResult {
  /** true = worker available, false = worker not available, null = not yet checked / loading */
  workerAvailable: boolean | null;
  /** true when API/server unreachable (network error, 5xx). Distinct from worker unavailable. */
  serverUnavailable: boolean;
  isLoading: boolean;
  /** Hard refetch (shows loading state) and resets the backoff timer. */
  refetch: () => void;
  /**
   * Notify the hook that the user is active (e.g. sent a message).
   * Resets the backoff timer back to baseIntervalSeconds without triggering an
   * immediate check — the next scheduled check will fire after the base interval.
   */
  notifyActivity: () => void;
}

/**
 * Checks agent worker liveness via heartbeat endpoint when a new activation is opened.
 * Returns worker availability to show Live tag or warning in the conversation header.
 *
 * Uses exponential backoff for periodic checks: starts at baseIntervalSeconds and
 * doubles the wait after each check (capped at maxIntervalSeconds). The backoff resets
 * to the base interval on user activity, manual refetch, activation change, or tab focus.
 */
export function useAgentHeartbeat({
  tenantId,
  agentName,
  activationName,
  enabled = true,
  baseIntervalSeconds = 30,
  maxIntervalSeconds = 300,
}: UseAgentHeartbeatParams): UseAgentHeartbeatResult {
  const [workerAvailable, setWorkerAvailable] = useState<boolean | null>(null);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tracks the current backoff interval; mutated inside the scheduling effect.
  const currentIntervalRef = useRef(baseIntervalSeconds);
  // Incrementing this cancels + restarts the scheduling effect (resets backoff).
  const [scheduleTrigger, setScheduleTrigger] = useState(0);

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

  // Initial check when activation changes
  useEffect(() => {
    checkHeartbeat(false);
  }, [checkHeartbeat]);

  // Exponential backoff scheduling.
  // Re-runs on activation change (checkHeartbeat identity change) OR on explicit reset
  // (scheduleTrigger increment). Always restarts from baseIntervalSeconds.
  useEffect(() => {
    if (!enabled || !tenantId || !agentName || !activationName) return;

    currentIntervalRef.current = baseIntervalSeconds;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timeoutId = setTimeout(async () => {
        await checkHeartbeat(true);
        const next = currentIntervalRef.current * 2;
        if (next > maxIntervalSeconds) {
          // Reached the cap — stop polling until user activity or tab refocus resets backoff.
          return;
        }
        currentIntervalRef.current = next;
        scheduleNext();
      }, currentIntervalRef.current * 1000);
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [checkHeartbeat, enabled, tenantId, agentName, activationName, baseIntervalSeconds, maxIntervalSeconds, scheduleTrigger]);

  // Reset backoff when the user returns to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setScheduleTrigger((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  /** Resets the backoff schedule to baseIntervalSeconds without an immediate check. */
  const notifyActivity = useCallback(() => {
    setScheduleTrigger((n) => n + 1);
  }, []);

  /** Hard check (shows loading) + resets backoff. */
  const refetch = useCallback(() => {
    setScheduleTrigger((n) => n + 1);
    checkHeartbeat(false);
  }, [checkHeartbeat]);

  return {
    workerAvailable,
    serverUnavailable,
    isLoading,
    refetch,
    notifyActivity,
  };
}
