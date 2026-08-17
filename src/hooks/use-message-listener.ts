'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { XiansMessage } from '@/lib/xians/types';

export interface UseMessageListenerParams {
  tenantId: string | null;
  agentName: string | null;
  activationName: string | null;
  enabled?: boolean;
  onMessage?: (message: XiansMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  /**
   * Fired when the stream is re-established after a drop. Messages published while
   * the stream was down are never replayed, so callers must backfill from history.
   */
  onReconnect?: () => void;
}

export interface UseMessageListenerReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  /** Reconnect only if the stream is actually down; a handshake in progress is left alone. */
  ensureConnected: () => void;
  maxReconnectAttemptsReached: boolean;
  /** True once a stream has been established at least once for these parameters. */
  hasEverConnected: boolean;
}

const HEARTBEAT_SECONDS = 30;
/** Silence longer than a couple of heartbeats means the stream is dead, whatever readyState says. */
const STALE_STREAM_MS = HEARTBEAT_SECONDS * 1000 * 2.5;
const WATCHDOG_INTERVAL_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
/** Slow retry cadence once the backoff ladder is exhausted, or while the browser reports itself offline. */
const IDLE_RETRY_DELAY_MS = 60_000;
/** Floor between forced reconnects, so repeatedly focusing the tab can't hammer a down server. */
const MIN_FORCED_RECONNECT_INTERVAL_MS = 10_000;

const MESSAGE_EVENT_TYPES = ['Chat', 'Reasoning', 'Tool', 'Data', 'File'] as const;

/**
 * Custom hook to manage SSE connection for real-time message listening
 * 
 * @param params - Connection parameters and callbacks
 * @returns Connection state and control functions
 */
export function useMessageListener(
  params: UseMessageListenerParams
): UseMessageListenerReturn {
  const {
    tenantId,
    agentName,
    activationName,
    enabled = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    onReconnect,
  } = params;

  // Connection outcomes are tracked per parameter set rather than as plain
  // booleans, so switching agent/activation implicitly clears stale state.
  const connectionKey = `${tenantId}|${agentName}|${activationName}`;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectedKey, setConnectedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectedRef = useRef(false);
  const hasEverConnectedRef = useRef(false);
  const lastConnectionKeyRef = useRef<string | null>(null);
  // Timestamp of the last event received on the stream (heartbeats included).
  const lastEventAtRef = useRef(0);
  const lastConnectAttemptAtRef = useRef(0);
  // Latest connect(), so watchdog/network listeners never call a stale closure.
  const connectRef = useRef<() => void>(() => {});

  const hasEverConnected = connectedKey === connectionKey;
  const maxReconnectAttemptsReached = failedKey === connectionKey;

  // Store callbacks in refs to prevent reconnections when they change
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onReconnectRef = useRef(onReconnect);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onReconnectRef.current = onReconnect;
  }, [onMessage, onError, onConnect, onDisconnect, onReconnect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      isConnectedRef.current = false;
      onDisconnectRef.current?.();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback((key: string) => {
    if (reconnectTimeoutRef.current) {
      return;
    }

    // Retrying at full speed while the device is offline just burns attempts.
    // `navigator.onLine` is only a hint though (it reads false on some VPN and
    // captive-portal setups), so keep a slow retry armed rather than relying
    // solely on the `online` event.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.log('[SSE] Offline, retrying slowly until the network is back');
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectRef.current();
      }, IDLE_RETRY_DELAY_MS);
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[SSE] Max reconnection attempts reached, retrying slowly');
      setFailedKey(key);
      onDisconnectRef.current?.();
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        reconnectAttemptsRef.current = 0;
        connectRef.current();
      }, IDLE_RETRY_DELAY_MS);
      return;
    }

    const backoff = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY_MS
    );
    // Jitter avoids every open tab reconnecting in lockstep after a server blip.
    const delay = Math.round(backoff + Math.random() * backoff * 0.25);

    console.log(
      `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );
    reconnectAttemptsRef.current++;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    // Validate required parameters
    if (!tenantId || !agentName || !activationName) {
      console.log('[SSE] Missing required parameters:', { tenantId, agentName, activationName });
      return;
    }

    if (!enabled) {
      console.log('[SSE] Connection disabled');
      return;
    }

    // If already connected, don't create a new connection
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      console.log('[SSE] Connection already exists, skipping new connection');
      return;
    }

    // Disconnect existing connection (cleanup)
    disconnect();

    // A different agent/activation is a fresh connection, not a reconnection.
    if (lastConnectionKeyRef.current !== connectionKey) {
      lastConnectionKeyRef.current = connectionKey;
      hasEverConnectedRef.current = false;
      reconnectAttemptsRef.current = 0;
    }

    try {
      // Build query parameters
      // participantId is now obtained from session on the backend for security
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        heartbeatSeconds: String(HEARTBEAT_SECONDS),
      });

      const url = `/api/messaging/listen?${queryParams.toString()}`;
      
      console.log('[SSE] Attempting to connect to:', url);

      lastEventAtRef.current = Date.now();
      lastConnectAttemptAtRef.current = Date.now();
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Anything arriving on the wire counts as liveness for the watchdog,
      // including untyped events we don't otherwise handle.
      eventSource.onmessage = () => {
        lastEventAtRef.current = Date.now();
      };

      // Handle connection open
      eventSource.addEventListener('open', () => {
        console.log('[SSE] Connection established');
        lastEventAtRef.current = Date.now();
        setIsConnected(true);
        setError(null);
        setFailedKey((prev) => (prev === connectionKey ? null : prev));
        setConnectedKey(connectionKey);
        reconnectAttemptsRef.current = 0;
        isConnectedRef.current = true;
        onConnectRef.current?.();

        if (hasEverConnectedRef.current) {
          // Nothing is replayed on a new stream, so the caller has to backfill.
          onReconnectRef.current?.();
        } else {
          hasEverConnectedRef.current = true;
        }
      });

      // Handle 'connected' event (initial connection confirmation from Xians)
      eventSource.addEventListener('connected', (event) => {
        lastEventAtRef.current = Date.now();
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Connected to thread:', data.threadId);
        } catch (err) {
          console.error('[SSE] Error parsing connected event:', err);
        }
      });

      // Chat/Reasoning/Tool/Data/File all carry a XiansMessage payload.
      // File matters for SendFileAsync replies, which would otherwise stay
      // invisible until the user refreshes history.
      for (const eventType of MESSAGE_EVENT_TYPES) {
        eventSource.addEventListener(eventType, (event) => {
          lastEventAtRef.current = Date.now();
          try {
            const message = JSON.parse(event.data) as XiansMessage;
            onMessageRef.current?.(message);
          } catch (err) {
            console.error(`[SSE] Error parsing ${eventType} message:`, err);
            const parseError =
              err instanceof Error ? err : new Error(`Failed to parse ${eventType} message`);
            setError(parseError);
            onErrorRef.current?.(parseError);
          }
        });
      }

      // Handle heartbeat events (keep-alive)
      eventSource.addEventListener('heartbeat', (event) => {
        lastEventAtRef.current = Date.now();
        try {
          const data = JSON.parse(event.data);
          // Heartbeats are silent - only log if there's an issue
          if (data.subscriberCount === 0) {
            console.warn('[SSE] No subscribers on heartbeat');
          }
        } catch (err) {
          console.error('[SSE] Error parsing heartbeat:', err);
        }
      });

      // Handle errors
      eventSource.addEventListener('error', () => {
        const wasConnected = isConnectedRef.current;
        const readyState = eventSource.readyState;

        console.warn('[SSE] Connection error', {
          readyState,
          readyStateText: readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : 'CLOSED',
          wasConnected,
          url,
        });

        // A drop after a healthy stream is usually a transient network/proxy issue.
        // Failing before the stream ever opened points at auth, CORS or the server.
        const connectionError = new Error(
          wasConnected
            ? 'SSE connection lost. Attempting to reconnect...'
            : 'Failed to establish SSE connection. Check server availability and CORS settings.'
        );
        setError(connectionError);
        setIsConnected(false);
        isConnectedRef.current = false;
        onErrorRef.current?.(connectionError);

        // Close the connection: the browser's own retry has no backoff and would
        // race with ours.
        eventSource.close();
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }

        scheduleReconnect(connectionKey);
      });
    } catch (err) {
      console.error('[SSE] Error creating EventSource:', err);
      const connectionError = err instanceof Error ? err : new Error('Failed to create SSE connection');
      setError(connectionError);
      setIsConnected(false);
      isConnectedRef.current = false;
      onErrorRef.current?.(connectionError);
      scheduleReconnect(connectionKey);
    }
  }, [
    tenantId,
    agentName,
    activationName,
    connectionKey,
    enabled,
    disconnect,
    scheduleReconnect,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const forceReconnect = useCallback((reason: string, { resetAttempts = false } = {}) => {
    console.log(`[SSE] Reconnecting now (${reason})`);
    // Only a deliberate user action clears the backoff ladder. Automatic triggers
    // keep counting, otherwise a user alt-tabbing during an outage would reset the
    // ladder forever and `maxReconnectAttemptsReached` would never be reached.
    if (resetAttempts) {
      reconnectAttemptsRef.current = 0;
      setFailedKey(null);
    }
    disconnect();
    connectRef.current();
  }, [disconnect]);

  const reconnect = useCallback(() => {
    forceReconnect('manual reconnect', { resetAttempts: true });
  }, [forceReconnect]);

  /**
   * Revive the stream only when it is genuinely down. Unlike `reconnect`, a
   * handshake still in flight is left to finish - tearing it down would restart
   * the wait and, on a first connection, skip the `onReconnect` backfill.
   */
  const ensureConnected = useCallback(() => {
    const readyState = eventSourceRef.current?.readyState;
    if (readyState === EventSource.OPEN || readyState === EventSource.CONNECTING) {
      return;
    }
    forceReconnect('send while disconnected', { resetAttempts: true });
  }, [forceReconnect]);

  // Connect on mount or when parameters change
  useEffect(() => {
    if (!enabled || !tenantId || !agentName || !activationName) {
      return;
    }

    // Opening the stream is deferred so it happens outside the commit phase.
    const startTimeout = setTimeout(() => connectRef.current(), 0);

    return () => {
      clearTimeout(startTimeout);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tenantId, agentName, activationName]);

  // A dropped stream does not always surface as an `error` event: after a sleep/wake
  // or a silently killed proxy connection the EventSource can sit in OPEN forever.
  // Heartbeats let us notice the silence and rebuild the stream.
  useEffect(() => {
    if (!enabled || !tenantId || !agentName || !activationName) {
      return;
    }

    const ensureAlive = (reason: string, { ignorePending = false } = {}) => {
      if (reconnectTimeoutRef.current && !ignorePending) {
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }

      const readyState = eventSourceRef.current?.readyState;
      const isLive = readyState === EventSource.OPEN || readyState === EventSource.CONNECTING;
      const isStale = Date.now() - lastEventAtRef.current > STALE_STREAM_MS;
      if (isLive && !isStale) {
        return;
      }

      if (Date.now() - lastConnectAttemptAtRef.current < MIN_FORCED_RECONNECT_INTERVAL_MS) {
        return;
      }

      forceReconnect(reason);
    };

    const watchdog = setInterval(() => {
      ensureAlive(`no events for over ${Math.round(STALE_STREAM_MS / 1000)}s`);
    }, WATCHDOG_INTERVAL_MS);

    const handleOnline = () => ensureAlive('network came back', { ignorePending: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ensureAlive('tab became visible', { ignorePending: true });
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(watchdog);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, tenantId, agentName, activationName, forceReconnect]);

  return {
    isConnected,
    error,
    reconnect,
    ensureConnected,
    maxReconnectAttemptsReached,
    hasEverConnected,
  };
}
