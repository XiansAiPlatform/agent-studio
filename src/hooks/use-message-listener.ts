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
}

export interface UseMessageListenerReturn {
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  maxReconnectAttemptsReached: boolean;
}

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
  } = params;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [maxReconnectAttemptsReached, setMaxReconnectAttemptsReached] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // Start with 1 second

  // Store callbacks in refs to prevent reconnections when they change
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onDisconnectRef.current?.();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
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

    try {
      // Build query parameters
      // participantId is now obtained from session on the backend for security
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        heartbeatSeconds: '60',
      });

      const url = `/api/tenants/${tenantId}/messaging/listen?${queryParams.toString()}`;
      
      console.log('[SSE] Attempting to connect to:', url);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;
      
      // Log initial state
      console.log('[SSE] EventSource created with readyState:', eventSource.readyState);

      // Handle connection open
      eventSource.addEventListener('open', () => {
        console.log('[SSE] Connection established');
        setIsConnected(true);
        setError(null);
        setMaxReconnectAttemptsReached(false);
        reconnectAttemptsRef.current = 0;
        onConnectRef.current?.();
      });

      // Handle 'connected' event (initial connection confirmation from Xians)
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Connected to thread:', data.threadId);
        } catch (err) {
          console.error('[SSE] Error parsing connected event:', err);
        }
      });

      // Handle 'Chat' event type (chat messages from agent/user)
      eventSource.addEventListener('Chat', (event) => {
        try {
          const message = JSON.parse(event.data) as XiansMessage;
          
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error('[SSE] Error parsing Chat message:', err);
          const parseError = err instanceof Error ? err : new Error('Failed to parse Chat message');
          setError(parseError);
          onErrorRef.current?.(parseError);
        }
      });

      // Handle 'Reasoning' event type (agent thinking/reasoning steps)
      eventSource.addEventListener('Reasoning', (event) => {
        try {
          const message = JSON.parse(event.data) as XiansMessage;
          
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error('[SSE] Error parsing Reasoning message:', err);
          const parseError = err instanceof Error ? err : new Error('Failed to parse Reasoning message');
          setError(parseError);
          onErrorRef.current?.(parseError);
        }
      });

      // Handle 'Tool' event type (agent tool execution steps)
      eventSource.addEventListener('Tool', (event) => {
        try {
          const message = JSON.parse(event.data) as XiansMessage;
          
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error('[SSE] Error parsing Tool message:', err);
          const parseError = err instanceof Error ? err : new Error('Failed to parse Tool message');
          setError(parseError);
          onErrorRef.current?.(parseError);
        }
      });

      // Handle 'Data' event type (structured data messages)
      eventSource.addEventListener('Data', (event) => {
        try {
          const message = JSON.parse(event.data) as XiansMessage;
          
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error('[SSE] Error parsing Data message:', err);
          const parseError = err instanceof Error ? err : new Error('Failed to parse Data message');
          setError(parseError);
          onErrorRef.current?.(parseError);
        }
      });

      // Handle heartbeat events (keep-alive)
      eventSource.addEventListener('heartbeat', (event) => {
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
      eventSource.addEventListener('error', (event) => {
        const readyState = eventSource.readyState;
        const readyStateText = readyState === 0 ? 'CONNECTING' : readyState === 1 ? 'OPEN' : 'CLOSED';
        
        console.error('[SSE] Connection error', {
          readyState,
          readyStateText,
          eventType: event.type,
          timeStamp: event.timeStamp,
          wasConnected: isConnected,
        });
        
        // If we were previously connected and got an error, this is likely a transient network issue
        // If we never connected (readyState === 0), this could be a CORS, auth, or server issue
        const errorMessage = readyState === 0 
          ? 'Failed to establish SSE connection. Check server availability and CORS settings.'
          : 'SSE connection lost. Attempting to reconnect...';
        
        const connectionError = new Error(errorMessage);
        setError(connectionError);
        setIsConnected(false);
        onErrorRef.current?.(connectionError);

        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Only auto-reconnect if we had successfully connected before, or haven't exceeded attempts
        const shouldReconnect = reconnectAttemptsRef.current < maxReconnectAttempts;
        
        if (shouldReconnect) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnection attempts reached. Please check:', {
            url,
            tenantId,
            agentName,
            activationName,
          });
          setMaxReconnectAttemptsReached(true);
          onDisconnectRef.current?.();
        }
      });
    } catch (err) {
      console.error('[SSE] Error creating EventSource:', err);
      const connectionError = err instanceof Error ? err : new Error('Failed to create SSE connection');
      setError(connectionError);
      onErrorRef.current?.(connectionError);
    }
  }, [
    tenantId,
    agentName,
    activationName,
    enabled,
    disconnect,
  ]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnect
    setMaxReconnectAttemptsReached(false); // Reset max attempts flag
    connect();
  }, [connect]);

  // Connect on mount or when parameters change
  useEffect(() => {
    if (enabled && tenantId && agentName && activationName) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tenantId, agentName, activationName]);

  return {
    isConnected,
    error,
    reconnect,
    maxReconnectAttemptsReached,
  };
}
