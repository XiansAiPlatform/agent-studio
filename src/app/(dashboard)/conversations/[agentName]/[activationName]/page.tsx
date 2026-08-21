'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageLoader } from '@/components/ui/page-loader';
import { useTenant } from '@/hooks/use-tenant';
import { useMessageListener } from '@/hooks/use-message-listener';
import { showErrorToast } from '@/lib/utils/error-handler';
import { toast } from 'sonner';
import { Message, Topic } from '@/types/conversation';
import { useActivations, useTopics, useConversationState, useAgentHeartbeat, useBuiltInWorkflows } from '../../hooks';
import { useParticipantLayout } from '@/contexts/participant-layout-context';
import {
  getTopicParam,
  mapXiansMessageToMessage,
  mergeMessagesById,
  sanitizeTopicDisplayName,
} from '../../utils';
import { MessageStatesMap, TopicMessageState } from '../../types';
import type { FileUploadPayload } from '@/components/features/conversations';
import { AgentActivationSelector } from '@/components/features/conversations';
import type { XiansMessage } from '@/lib/xians/types';
import { ConversationView } from '../../_components';
import { ParticipantMenuBar } from './_components';
import { resolveWorkflowName } from '@/lib/xians/built-in-workflows';

/** Page size for the paginated message history (initial load and "load more"). */
const MESSAGE_PAGE_SIZE = 10;
/** A backfill after an outage reaches back further than one page. */
const MESSAGE_SYNC_SIZE = 30;
/** How often to poll history while the live stream is down. */
const OFFLINE_POLL_INTERVAL_MS = 10000;

/**
 * Conversation Page
 * 
 * This page displays the conversation interface for a specific agent activation.
 * It shows a list of topics on the left and the chat interface on the right.
 * 
 * Route: /conversations/[agentName]/[activationName]
 * Query params: ?topic=<topicId>&workflow=<workflowName>
 */
function ConversationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  const { onOpenMenu, topicDeletedEvent, notifyTopicDeleted } = useParticipantLayout();
  
  // Get route parameters
  const agentName = decodeURIComponent(params.agentName as string);
  const activationName = decodeURIComponent(params.activationName as string);
  const topicParam = searchParams.get('topic');
  const workflowParam = searchParams.get('workflow')?.trim() || null;

  // State
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [messageStates, setMessageStates] = useState<MessageStatesMap>({});
  const [lastActivationKey, setLastActivationKey] = useState<string>('');
  
  // Ref for chat input to focus after topic creation or activation change
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoFocusedRef = useRef(false);
  // Incrementing this triggers the auto-focus effect even when selectedTopicId hasn't changed
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [agentInfo, setAgentInfo] = useState<{
    summary: string | null;
    description: string | null;
    category: string | null;
    samplePrompts: string[] | null;
  } | null>(null);

  // Fetch activations (for switching between agents)
  const { activations, isLoading: isLoadingActivations } = useActivations(currentTenantId);

  const agentNamesForWorkflows = useMemo(() => {
    const names = new Set(activations.map((activation) => activation.agentName));
    if (agentName) names.add(agentName);
    return Array.from(names);
  }, [activations, agentName]);

  const { workflowsByAgent } = useBuiltInWorkflows(agentNamesForWorkflows);
  const currentWorkflowsReady = Boolean(agentName) && agentName in workflowsByAgent;
  const selectedWorkflowType = currentWorkflowsReady
    ? resolveWorkflowName(workflowParam, workflowsByAgent[agentName] ?? [])
    : null;
  // Do not load topics/SSE until a registered workflow is known.
  const activeWorkflowType = selectedWorkflowType;

  // Fetch topics
  const {
    topics,
    setTopics,
    isLoading: isLoadingTopics,
    totalPages,
    hasMore,
    noConversationalCapability,
    setNoConversationalCapability,
    fetchError,
    addTopic,
    refetch: refetchTopics,
  } = useTopics({
    tenantId: currentTenantId,
    agentName,
    activationName,
    workflowType: activeWorkflowType,
    page: currentPage,
  });

  const markNoConversationalCapability = useCallback(() => {
    setNoConversationalCapability(true);
  }, [setNoConversationalCapability]);

  // Conversation state management
  const {
    conversation,
    unreadCounts,
    handleIncomingMessage,
    updateTopicMessages,
    mergeTopicMessages,
    addMessageToTopic,
    applyMessageFeedback,
  } = useConversationState({
    tenantId: currentTenantId || '',
    agentName: agentName || '',
    activationName: activationName || '',
    workflowType: selectedWorkflowType ?? '',
    topics,
    selectedTopicId,
    onNoConversationalCapability: markNoConversationalCapability,
  });

  // Persist the resolved workflow so refresh/share does not invent a default name.
  useEffect(() => {
    if (!selectedWorkflowType || workflowParam === selectedWorkflowType) return;
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.set('workflow', selectedWorkflowType);
    router.replace(
      `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?${urlParams.toString()}`,
      { scroll: false }
    );
  }, [agentName, activationName, selectedWorkflowType, workflowParam, searchParams, router]);

  // Fetch agent deployment for empty chat state (summary, description, category)
  useEffect(() => {
    if (!agentName || !currentTenantId || !session?.user?.email) {
      setAgentInfo(null);
      return;
    }
    let cancelled = false;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const agent = data.agent ?? data;
          const prompts = agent?.samplePrompts ?? data?.samplePrompts;
          const samplePrompts = Array.isArray(prompts)
            ? prompts.filter((p): p is string => typeof p === 'string').slice(0, 6)
            : null;
          setAgentInfo({
            summary: agent?.summary ?? data?.summary ?? null,
            description: agent?.description ?? data?.description ?? null,
            category: agent?.category ?? data?.category ?? null,
            samplePrompts: samplePrompts?.length ? samplePrompts : null,
          });
        } else {
          setAgentInfo(null);
        }
      } catch {
        if (!cancelled) setAgentInfo(null);
      }
    };
    fetchAgent();
    return () => { cancelled = true; };
  }, [agentName, currentTenantId, session?.user?.email]);

  // Pull the latest history for a topic and merge it into what's on screen.
  // The SSE stream replays nothing, so any reply published while it was down is
  // only recoverable from history.
  const syncingTopicsRef = useRef<Set<string>>(new Set());
  const syncTopicMessages = useCallback(async (topicId: string) => {
    if (!currentTenantId || !agentName || !activationName || !topicId || !activeWorkflowType) {
      return;
    }

    // Reconnect backfill, topic switch and the offline poll can all fire at once;
    // one request per topic at a time is enough.
    if (syncingTopicsRef.current.has(topicId)) {
      return;
    }
    syncingTopicsRef.current.add(topicId);

    try {
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: getTopicParam(topicId),
        page: '1',
        pageSize: String(MESSAGE_SYNC_SIZE),
        chatOnly: 'false',
        sortOrder: 'desc',
        workflowType: activeWorkflowType,
      });

      const response = await fetch(`/api/messaging/history?${queryParams.toString()}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return;
      }

      const latest: Message[] = data
        .map((row: XiansMessage) => mapXiansMessageToMessage(row))
        .reverse();

      setMessageStates(prev => {
        const state = prev[topicId];
        if (!state) return prev;

        const messages = mergeMessagesById(state.messages, latest);
        const unchanged =
          messages.length === state.messages.length &&
          messages.every((m, i) => m === state.messages[i]);
        if (unchanged) return prev;

        return {
          ...prev,
          [topicId]: {
            ...state,
            messages,
            // A sync spans several pages, so leaving the cursor behind would make
            // "load more" refetch rows that are already on screen.
            page: Math.max(state.page, Math.ceil(latest.length / MESSAGE_PAGE_SIZE)),
          },
        };
      });

      mergeTopicMessages(topicId, latest);
    } catch (error) {
      console.warn('[ConversationPage] Failed to sync messages:', error);
    } finally {
      syncingTopicsRef.current.delete(topicId);
    }
  }, [currentTenantId, agentName, activationName, activeWorkflowType, mergeTopicMessages]);

  // Keep the topic in a ref so the reconnect handler stays stable — passing an
  // unstable callback into the listener is fine (it stores it in a ref), but the
  // polling fallback below re-subscribes on every change.
  const selectedTopicIdRef = useRef(selectedTopicId);
  useEffect(() => {
    selectedTopicIdRef.current = selectedTopicId;
  }, [selectedTopicId]);

  // Messages are fetched once per topic and then cached, so a topic that received
  // messages while the stream was down would stay stale on re-entry.
  const messageStatesRef = useRef(messageStates);
  useEffect(() => {
    messageStatesRef.current = messageStates;
  }, [messageStates]);

  useEffect(() => {
    // Topics without cached state are handled by the initial fetch below.
    if (selectedTopicId && messageStatesRef.current[selectedTopicId]) {
      syncTopicMessages(selectedTopicId);
    }
  }, [selectedTopicId, syncTopicMessages]);

  // SSE reconnect handler - backfill whatever the dropped stream missed
  const handleSSEReconnect = useCallback(() => {
    const topicId = selectedTopicIdRef.current;
    console.log('[SSE] Reconnected, backfilling missed messages for topic:', topicId);
    if (topicId) {
      syncTopicMessages(topicId);
    }
  }, [syncTopicMessages]);

  // Warn once per outage - the listener retries on its own, so a toast per
  // failed attempt would just stack up.
  const hasWarnedAboutSSERef = useRef(false);

  // SSE error handler
  const handleSSEError = useCallback((error: Error) => {
    console.warn('[SSE] Connection error:', error.message);
    const isConnectionError = error.message.includes('SSE connection');
    if (!isConnectionError || hasWarnedAboutSSERef.current) {
      return;
    }
    hasWarnedAboutSSERef.current = true;
    toast.error('Real-time connection lost', {
      description: 'Reconnecting… replies will keep arriving, just a little slower.',
      duration: 5000,
    });
  }, []);

  // SSE connect handler
  const handleSSEConnect = useCallback(() => {
    hasWarnedAboutSSERef.current = false;
    console.log('[SSE] Real-time connection established');
  }, []);

  // SSE disconnect handler
  const handleSSEDisconnect = useCallback(() => {
    // Disconnected - silent
  }, []);

  // Check if the selected activation is active
  const selectedActivation = activations.find(
    a => a.name === activationName && a.agentName === agentName
  );
  const isActivationActive = selectedActivation?.status === 'active';

  // Set up SSE connection - only for active activations
  const {
    isConnected,
    error: sseError,
    maxReconnectAttemptsReached,
    hasEverConnected,
    ensureConnected: ensureMessageStreamConnected,
  } = useMessageListener({
    tenantId: currentTenantId,
    agentName,
    activationName,
    workflowType: activeWorkflowType,
    enabled: !!(currentTenantId && agentName && activationName && session?.user?.email && isActivationActive && activeWorkflowType),
    onMessage: handleIncomingMessage,
    onError: handleSSEError,
    onConnect: handleSSEConnect,
    onDisconnect: handleSSEDisconnect,
    onReconnect: handleSSEReconnect,
  });

  // While the stream is down, poll history so replies still show up instead of
  // silently waiting for a connection that may never come back.
  useEffect(() => {
    if (isConnected || !selectedTopicId || !isActivationActive) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncTopicMessages(selectedTopicId);
      }
    }, OFFLINE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isConnected, selectedTopicId, isActivationActive, syncTopicMessages]);

  // Check agent worker liveness when activation is opened (for Live tag vs warning)
  const {
    workerAvailable,
    serverUnavailable,
    isLoading: isHeartbeatLoading,
    refetch: refetchHeartbeat,
    notifyActivity: notifyHeartbeatActivity,
  } = useAgentHeartbeat({
    tenantId: currentTenantId,
    agentName,
    activationName,
    workflowType: activeWorkflowType,
    enabled: !!(currentTenantId && agentName && activationName && activeWorkflowType),
  });

  // Redirect to the server unavailable page only when the stream never came up.
  // Once it has worked, a drop is handled by the background retries plus polling,
  // so throwing the user out of a live conversation would do more harm than good.
  useEffect(() => {
    if (maxReconnectAttemptsReached && !hasEverConnected) {
      const currentUrl = `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?${searchParams.toString()}`;
      const errorMessage = sseError?.message || 'Failed to establish connection to the real-time messaging server after multiple attempts';
      const urlParams = new URLSearchParams({
        error: errorMessage,
        returnUrl: currentUrl,
      });
      router.push(`/server-unavailable?${urlParams.toString()}`);
    }
  }, [maxReconnectAttemptsReached, hasEverConnected, sseError, searchParams, router, agentName, activationName]);

  // Handle activation change (navigate to different agent/activation)
  const handleActivationChange = useCallback((newActivationName: string, newAgentName: string, workflowName: string) => {
    const urlParams = new URLSearchParams();
    urlParams.set('topic', 'general-discussions');
    if (workflowName.trim()) {
      urlParams.set('workflow', workflowName.trim());
    }
    router.push(`/conversations/${encodeURIComponent(newAgentName)}/${encodeURIComponent(newActivationName)}?${urlParams.toString()}`);
  }, [router]);

  // Update URL when topic is selected
  const updateTopicInURL = useCallback((topicId: string) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    if (topicId) {
      urlParams.set('topic', topicId);
    } else {
      urlParams.delete('topic');
    }
    router.push(`/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?${urlParams.toString()}`, { scroll: false });
  }, [searchParams, router, agentName, activationName]);

  // Handle topic creation
  const handleCreateTopic = useCallback((topicName: string) => {
    // Create new topic with the provided name
    const newTopic: Topic = {
      id: topicName, // Use the topic name as the ID (will be used as scope)
      name: topicName,
      createdAt: new Date().toISOString(),
      status: 'active',
      messages: [],
      associatedTasks: [],
      isDefault: false,
      messageCount: 0,
      lastMessageAt: new Date().toISOString(),
    };

    // Add topic to the list
    addTopic(newTopic);
    
    // Select the newly created topic
    setSelectedTopicId(newTopic.id);
    updateTopicInURL(newTopic.id);

    // Focus the chat input after a short delay to ensure rendering is complete
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, [addTopic, updateTopicInURL]);

  // Handle topic deletion
  const handleDeleteTopic = useCallback(async (topicId: string, topicName: string) => {
    if (!currentTenantId || !agentName || !activationName || !selectedWorkflowType) {
      showErrorToast(new Error('Missing required parameters'), 'Unable to delete topic');
      return;
    }

    try {
      // Determine the topic parameter for the API call
      // 'general-discussions' means no topic parameter (scope=null)
      // Any other topicId is the actual topic name
      const topicParam = topicId === 'general-discussions' ? '' : topicId;

      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: topicParam,
        workflowType: selectedWorkflowType,
      });

      const response = await fetch(
        `/api/messaging/messages?${queryParams.toString()}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete topic messages');
      }

      // Clear messages from state for the deleted topic
      setMessageStates(prev => {
        const newStates = { ...prev };
        delete newStates[topicId];
        
        // If the deleted topic was selected and we're switching to general discussions,
        // also clear general discussions state to force a reload of its messages
        if (selectedTopicId === topicId) {
          delete newStates['general-discussions'];
        }
        
        return newStates;
      });

      // If the deleted topic was selected, switch to general discussions
      if (selectedTopicId === topicId) {
        const generalTopicId = 'general-discussions';
        setSelectedTopicId(generalTopicId);
        updateTopicInURL(generalTopicId);
        // When deleting general-discussions we stay on it; notify so fetch effect refetches
        if (topicId === 'general-discussions') {
          notifyTopicDeleted(agentName, activationName, topicId);
        }
      }
      // Clear displayed messages for the deleted topic
      updateTopicMessages(topicId, []);

      // Reload topics to reflect the updated message counts
      await refetchTopics();

      toast.success('Topic messages deleted', {
        description: `All messages in "${topicName}" have been deleted.`,
      });

      console.log('[ConversationPage] Topic messages deleted successfully:', topicId);
    } catch (error) {
      console.error('[ConversationPage] Error deleting topic:', error);
      showErrorToast(error, 'Failed to delete topic messages');
      throw error; // Re-throw to let the component handle the error state
    }
  }, [currentTenantId, agentName, activationName, selectedWorkflowType, selectedTopicId, updateTopicInURL, refetchTopics, notifyTopicDeleted, updateTopicMessages]);

  // Handle topic selection
  const handleTopicSelect = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    updateTopicInURL(topicId);
    
    // Focus the chat input after topic selection
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, [updateTopicInURL]);

  // Clear message states when activation, agent, or workflow changes
  useEffect(() => {
    const activationKey = `${agentName}-${activationName}-${selectedWorkflowType}`;
    if (activationKey !== lastActivationKey && lastActivationKey !== '') {
      console.log('[ConversationPage] Activation or workflow changed, clearing message states');
      setMessageStates({});
      setSelectedTopicId('general-discussions');
    }
    setLastActivationKey(activationKey);
  }, [agentName, activationName, selectedWorkflowType, lastActivationKey]);

  // Sync selected topic from URL
  useEffect(() => {
    if (topicParam && topics.length > 0) {
      const topicExists = topics.some(topic => topic.id === topicParam);
      if (topicExists && topicParam !== selectedTopicId) {
        setSelectedTopicId(topicParam);
      } else if (!topicExists) {
        // Topic from URL doesn't exist in fetched list - may be newly created (e.g. from participant tree).
        // Add it and select it; it will exist once user sends a message.
        // Use sanitized display name — topicParam can be arbitrary URL input.
        const newTopic: Topic = {
          id: topicParam,
          name: sanitizeTopicDisplayName(topicParam),
          createdAt: new Date().toISOString(),
          status: 'active',
          messages: [],
          associatedTasks: [],
          isDefault: false,
          messageCount: 0,
          lastMessageAt: new Date().toISOString(),
        };
        addTopic(newTopic);
        setSelectedTopicId(topicParam);
        hasAutoFocusedRef.current = false;
        setFocusTrigger((n) => n + 1);
      }
    } else if (topics.length > 0 && !selectedTopicId) {
      // Auto-select general discussions if no topic selected
      const initialTopicId = 'general-discussions';
      setSelectedTopicId(initialTopicId);
      updateTopicInURL(initialTopicId);
    }
  }, [topicParam, topics, selectedTopicId, updateTopicInURL, addTopic]);

  // Auto-focus chat input when activation changes and topic is selected.
  // `topics` is included so the effect re-runs after addTopic propagates through
  // useConversationState and ChatInputArea is mounted (chatInputRef.current becomes non-null).
  useEffect(() => {
    if (!selectedTopicId || isLoadingTopics || hasAutoFocusedRef.current || !chatInputRef.current) return;
    const timeoutId = setTimeout(() => {
      chatInputRef.current?.focus();
      hasAutoFocusedRef.current = true;
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [selectedTopicId, isLoadingTopics, focusTrigger, topics]);

  // Reset auto-focus flag when activation or topic changes (e.g. when selecting from participant tree)
  useEffect(() => {
    hasAutoFocusedRef.current = false;
  }, [agentName, activationName, topicParam]);

  // Fetch messages for selected topic
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email || !activeWorkflowType) {
        return;
      }

      const isTopicJustDeleted =
        topicDeletedEvent &&
        topicDeletedEvent.agentName === agentName &&
        topicDeletedEvent.activationName === activationName &&
        topicDeletedEvent.topicId === selectedTopicId;

      // Skip if already loading (unless we need to refetch due to topic delete)
      if (!isTopicJustDeleted && messageStates[selectedTopicId]?.isLoading) {
        return;
      }

      // Skip if we've already attempted to fetch for this topic (unless topic was just deleted)
      if (!isTopicJustDeleted && messageStates[selectedTopicId] !== undefined) {
        return;
      }

      if (isTopicJustDeleted) {
        // Clear cached messages and update UI immediately
        setMessageStates((prev) => {
          const next = { ...prev };
          delete next[selectedTopicId];
          return next;
        });
        updateTopicMessages(selectedTopicId, []);
      }

      setMessageStates(prev => ({
        ...prev,
        [selectedTopicId]: {
          ...prev[selectedTopicId],
          isLoading: true,
          messages: [],
          page: 1,
          hasMore: false,
        },
      }));

      try {
        const topicParamValue = getTopicParam(selectedTopicId);
        const queryParams = new URLSearchParams({
          agentName,
          activationName,
          topic: topicParamValue,
          page: '1',
          pageSize: String(MESSAGE_PAGE_SIZE),
          chatOnly: 'false',
          sortOrder: 'desc',
          workflowType: activeWorkflowType,
        });

        const response = await fetch(
          `/api/messaging/history?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch message history');
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          console.warn('[ConversationPage] Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }

        const messages: Message[] = data
          .map((row: XiansMessage) => mapXiansMessageToMessage(row))
          .reverse();

        setMessageStates(prev => ({
          ...prev,
          [selectedTopicId]: {
            messages,
            isLoading: false,
            isLoadingMore: false,
            hasMore: data.length === MESSAGE_PAGE_SIZE,
            page: 1,
          },
        }));

        updateTopicMessages(selectedTopicId, messages);

        console.log(`[ConversationPage] Loaded ${messages.length} messages for topic:`, selectedTopicId);
      } catch (error) {
        console.error('[ConversationPage] Error fetching messages:', error);
        showErrorToast(error, 'Failed to load messages');
        setMessageStates(prev => ({
          ...prev,
          [selectedTopicId]: {
            messages: prev[selectedTopicId]?.messages || [],
            isLoading: false,
            isLoadingMore: prev[selectedTopicId]?.isLoadingMore ?? false,
            hasMore: prev[selectedTopicId]?.hasMore ?? false,
            page: prev[selectedTopicId]?.page ?? 1,
          },
        }));
      }
    };
    
    fetchMessages();
  }, [currentTenantId, agentName, activationName, activeWorkflowType, selectedTopicId, session?.user?.email, updateTopicMessages, topicDeletedEvent]);

  // Handle sending messages
  // Note: we intentionally do not gate on `session.user.email` here. After a period
  // of inactivity the SessionProvider refetches `/api/auth/session` (on window focus
  // or on the 5-min interval), during which `useSession()` is transiently in a
  // loading state with `data: null`. The actual POST below doesn't carry the email
  // in the body — the server identifies the user from the auth cookie — so the
  // email check would cause false-positive failures without protecting anything.
  // A truly unauthenticated request is still caught by the `!response.ok` branch.
  const handleSendMessage = useCallback(async (content: string, topicId: string, files?: FileUploadPayload[]) => {
    if (!currentTenantId || !agentName || !activationName || !selectedWorkflowType) {
      console.error('[ConversationPage] Missing required parameters for sending message', {
        hasTenant: !!currentTenantId,
        hasAgent: !!agentName,
        hasActivation: !!activationName,
        hasWorkflow: !!selectedWorkflowType,
      });
      showErrorToast(new Error('Missing required parameters'), 'Unable to send message');
      return;
    }

    const hasFiles = !!files && files.length > 0;
    const trimmedContent = content.trim();
    if (!trimmedContent && !hasFiles) {
      return;
    }

    notifyHeartbeatActivity();

    // The reply comes back over SSE, so make sure the stream is alive before the
    // agent answers rather than waiting out the current backoff. A handshake
    // already in flight is left alone.
    ensureMessageStreamConnected();

    try {
      const topicParamValue = topicId === 'general-discussions' ? undefined : topicId;

      const requestBody = hasFiles
        ? {
            agentName,
            activationName,
            type: 'File',
            text: content,
            topic: topicParamValue,
            workflowType: selectedWorkflowType,
            data: {
              files: files!.map((file) => ({
                content: file.base64,
                fileName: file.fileName,
                contentType: file.contentType,
                ...(file.fileSize != null && { fileSize: file.fileSize }),
              })),
            },
          }
        : {
            agentName,
            activationName,
            text: content,
            topic: topicParamValue,
            workflowType: selectedWorkflowType,
          };

      const response = await fetch(
        `/api/messaging/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        let serverMessage = '';
        try {
          const errBody = await response.json();
          if (errBody?.error && typeof errBody.error === 'string') {
            serverMessage = errBody.error;
          }
        } catch {
          // response had no JSON body; fall back to a generic message
        }
        throw new Error(serverMessage || (hasFiles ? 'Failed to upload files' : 'Failed to send message'));
      }

      // Optimistically add the message to the UI
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        ...(hasFiles && {
          attachments: files!.map((file, index) => ({
            type: 'file' as const,
            id: `file-${Date.now()}-${index}`,
            name: file.fileName,
          })),
        }),
      };

      // Update message states - preserve all existing state properties
      setMessageStates(prev => ({
        ...prev,
        [topicId]: {
          messages: [...(prev[topicId]?.messages || []), newMessage],
          isLoading: prev[topicId]?.isLoading ?? false,
          isLoadingMore: prev[topicId]?.isLoadingMore ?? false,
          hasMore: prev[topicId]?.hasMore ?? false,
          page: prev[topicId]?.page ?? 1,
        },
      }));

      // Update conversation state
      addMessageToTopic(topicId, newMessage);

      console.log('[ConversationPage] Message sent successfully');
    } catch (error) {
      console.error('[ConversationPage] Error sending message:', error);
      showErrorToast(error, hasFiles ? 'Failed to upload files' : 'Failed to send message');
    }
  }, [
    currentTenantId,
    agentName,
    activationName,
    selectedWorkflowType,
    addMessageToTopic,
    notifyHeartbeatActivity,
    ensureMessageStreamConnected,
  ]);

  // Handle loading more messages
  const handleLoadMoreMessages = useCallback(async () => {
    if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email || !selectedWorkflowType) {
      return;
    }

    const currentState = messageStates[selectedTopicId];
    if (!currentState || currentState.isLoadingMore || !currentState.hasMore) {
      return;
    }

    const nextPage = currentState.page + 1;

    setMessageStates(prev => ({
      ...prev,
      [selectedTopicId]: {
        ...prev[selectedTopicId],
        isLoadingMore: true,
      },
    }));

    try {
      const topicParamValue = getTopicParam(selectedTopicId);
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: topicParamValue,
        page: nextPage.toString(),
        pageSize: String(MESSAGE_PAGE_SIZE),
        chatOnly: 'false',
        sortOrder: 'desc',
        workflowType: selectedWorkflowType,
      });

      const response = await fetch(
        `/api/messaging/history?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch more messages');
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn('[ConversationPage] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      const newMessages: Message[] = data
        .map((row: XiansMessage) => mapXiansMessageToMessage(row))
        .reverse();

      // Filter out duplicates
      const existingIds = new Set(currentState.messages.map(m => m.id));
      const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

      const updatedMessages = [...uniqueNewMessages, ...currentState.messages];

      setMessageStates(prev => ({
        ...prev,
        [selectedTopicId]: {
          messages: updatedMessages,
          isLoading: false,
          isLoadingMore: false,
          hasMore: data.length === MESSAGE_PAGE_SIZE,
          page: nextPage,
        },
      }));

      // Merge rather than replace: live SSE messages only ever land in the
      // conversation, so overwriting it here would drop everything received
      // since the last history fetch.
      mergeTopicMessages(selectedTopicId, updatedMessages);

      console.log(`[ConversationPage] Loaded ${uniqueNewMessages.length} more messages for topic:`, selectedTopicId);
    } catch (error) {
      console.error('[ConversationPage] Error fetching more messages:', error);
      showErrorToast(error, 'Failed to load more messages');
      setMessageStates(prev => ({
        ...prev,
        [selectedTopicId]: {
          ...prev[selectedTopicId],
          isLoadingMore: false,
        },
      }));
    }
  }, [currentTenantId, agentName, activationName, selectedWorkflowType, selectedTopicId, session?.user?.email, messageStates, mergeTopicMessages]);

  const handleMessageFeedbackSubmitted = useCallback(
    (messageId: string, feedback: NonNullable<Message['feedback']>) => {
      if (!selectedTopicId) return;
      applyMessageFeedback(selectedTopicId, messageId, feedback);
      setMessageStates((prev) => {
        const state = prev[selectedTopicId];
        if (!state) return prev;
        return {
          ...prev,
          [selectedTopicId]: {
            ...state,
            messages: state.messages.map((m) =>
              m.id === messageId ? { ...m, feedback } : m
            ),
          },
        };
      });
    },
    [selectedTopicId, applyMessageFeedback]
  );

  // Full-page loader only before the first conversation chrome is ready.
  // Switching workflow keeps ConversationView mounted so the agent and
  // workflow pickers do not remount; topics + discussion show their own loaders.
  const noRegisteredWorkflow = currentWorkflowsReady && !selectedWorkflowType;
  if (
    !currentTenantId ||
    (!conversation && !fetchError && !noConversationalCapability && !noRegisteredWorkflow)
  ) {
    return <PageLoader label="Loading conversation..." className="h-full" />;
  }

  const viewConversation = noConversationalCapability
    ? {
        ...(conversation ?? {
          id: `${agentName}-${activationName}-${selectedWorkflowType ?? ''}`,
          tenantId: currentTenantId,
          user: { id: 'current-user', name: 'You' },
          agent: {
            id: agentName || '',
            name: agentName || '',
            status: 'online' as const,
            avatar: undefined,
          },
          startTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          status: 'active' as const,
          topics: [],
        }),
        topics: [],
      }
    : conversation;

  // No conversation found
  if (!viewConversation) {
    const noConvContent = (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-12 bg-card min-h-0">
        <p className="text-foreground max-w-md text-base font-normal">
          {noRegisteredWorkflow
            ? `No chat workflows are registered for ${agentName}`
            : agentName && activationName
              ? `No topics found for ${activationName}`
              : 'There are no active conversations with this agent'
          }
        </p>
      </div>
    );
    return (
      <div className="flex flex-col h-full min-h-0">
        <ParticipantMenuBar onOpenMenu={onOpenMenu} label={(activationName || agentName) ? sanitizeTopicDisplayName(activationName || agentName) : 'Agent'} />
        <AgentActivationSelector
          activations={activations}
          selectedActivationName={activationName}
          selectedWorkflow={selectedWorkflowType ?? undefined}
          onActivationChange={handleActivationChange}
          isLoading={isLoadingActivations}
        />
        {noConvContent}
      </div>
    );
  }

  const currentMessageState: TopicMessageState = messageStates[selectedTopicId] || {
    messages: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    page: 1,
  };

  return (
    <div className="h-full">
      <ConversationView
        conversation={viewConversation}
        selectedTopicId={noConversationalCapability ? '' : selectedTopicId}
        onTopicSelect={handleTopicSelect}
        onSendMessage={handleSendMessage}
        allowFileUpload
        isLoadingMessages={currentMessageState.isLoading}
        onLoadMoreMessages={handleLoadMoreMessages}
        isLoadingMoreMessages={currentMessageState.isLoadingMore}
        hasMoreMessages={currentMessageState.hasMore}
        unreadCounts={noConversationalCapability ? {} : unreadCounts}
        activations={activations}
        selectedActivationName={activationName}
        onActivationChange={handleActivationChange}
        isLoadingActivations={isLoadingActivations}
        isLoadingTopics={isLoadingTopics && !noConversationalCapability}
        agentName={agentName}
        currentPage={noConversationalCapability ? 1 : currentPage}
        totalPages={noConversationalCapability ? 1 : totalPages}
        hasMore={noConversationalCapability ? false : hasMore}
        onPageChange={setCurrentPage}
        isConnected={isConnected}
        sseError={sseError}
        workerAvailable={workerAvailable}
        serverUnavailable={serverUnavailable}
        isHeartbeatLoading={isHeartbeatLoading}
        onRetryHeartbeat={refetchHeartbeat}
        onCreateTopic={noConversationalCapability ? undefined : handleCreateTopic}
        onDeleteTopic={noConversationalCapability ? undefined : handleDeleteTopic}
        chatInputRef={chatInputRef}
        agentInfo={agentInfo}
        onMessageFeedbackSubmitted={handleMessageFeedbackSubmitted}
        selectedWorkflow={selectedWorkflowType ?? undefined}
        noConversationalCapability={noConversationalCapability}
      />
    </div>
  );
}

export default function ConversationPage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<PageLoader label="Loading conversation..." className="h-full" />}>
        <ConversationContent />
      </Suspense>
    </div>
  );
}
