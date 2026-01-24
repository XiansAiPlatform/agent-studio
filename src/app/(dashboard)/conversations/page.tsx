'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bot, Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useMessageListener } from '@/hooks/use-message-listener';
import { showErrorToast } from '@/lib/utils/error-handler';
import { toast } from 'sonner';
import { Message } from '@/lib/data/dummy-conversations';
import { AgentSelectionView, ConversationView } from './components';
import { useActivations, useTopics, useConversationState } from './hooks';
import { getTopicParam } from './utils';
import { MessageStatesMap, TopicMessageState } from './types';

function ConversationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  
  // Get query parameters
  const agentName = searchParams.get('agent-name');
  const activationName = searchParams.get('activation-name');
  const topicParam = searchParams.get('topic');

  // State
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [messageStates, setMessageStates] = useState<MessageStatesMap>({});
  const [lastActivationKey, setLastActivationKey] = useState<string>('');

  // Fetch activations
  const { activations, isLoading: isLoadingActivations } = useActivations(currentTenantId);

  // Fetch topics
  const {
    topics,
    setTopics,
    isLoading: isLoadingTopics,
    totalPages,
    hasMore,
  } = useTopics({
    tenantId: currentTenantId,
    agentName,
    activationName,
    page: currentPage,
  });

  // Conversation state management
  const {
    conversation,
    unreadCounts,
    handleIncomingMessage,
    updateTopicMessages,
    addMessageToTopic,
  } = useConversationState({
    tenantId: currentTenantId || '',
    agentName: agentName || '',
    activationName: activationName || '',
    topics,
    selectedTopicId,
  });

  // SSE error handler
  const handleSSEError = useCallback((error: Error) => {
    console.error('[SSE] Connection error:', error.message);
    if (error.message.includes('Failed to establish SSE connection')) {
      toast.error('Real-time connection failed', {
        description: 'Messages may not update automatically. Try refreshing the page.',
        duration: 5000,
      });
    }
  }, []);

  // SSE connect handler
  const handleSSEConnect = useCallback(() => {
    console.log('[SSE] Real-time connection established');
    // toast.success('Real-time messaging connected', {
    //   description: 'You will receive agent responses instantly',
    //   duration: 2000,
    // });
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
  const { isConnected, error: sseError } = useMessageListener({
    tenantId: currentTenantId,
    agentName,
    activationName,
    enabled: !!(currentTenantId && agentName && activationName && session?.user?.email && isActivationActive),
    onMessage: handleIncomingMessage,
    onError: handleSSEError,
    onConnect: handleSSEConnect,
    onDisconnect: handleSSEDisconnect,
  });

  // Handle activation selection change
  const handleActivationChange = useCallback((newActivationName: string, newAgentName: string) => {
    const params = new URLSearchParams();
    params.set('agent-name', newAgentName);
    params.set('activation-name', newActivationName);
    params.set('topic', 'general-discussions');
    router.push(`/conversations?${params.toString()}`, { scroll: false });
  }, [router]);

  // Update URL when topic is selected
  const updateTopicInURL = useCallback((topicId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (topicId) {
      params.set('topic', topicId);
    } else {
      params.delete('topic');
    }
    router.push(`/conversations?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Handle topic selection
  const handleTopicSelect = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    updateTopicInURL(topicId);
  }, [updateTopicInURL]);

  // Clear message states when activation or agent changes
  useEffect(() => {
    const activationKey = `${agentName}-${activationName}`;
    if (activationKey !== lastActivationKey && lastActivationKey !== '') {
      console.log('[ConversationsPage] Activation changed, clearing message states');
      setMessageStates({});
      setSelectedTopicId('');
    }
    setLastActivationKey(activationKey);
  }, [agentName, activationName, lastActivationKey]);

  // Sync selected topic from URL
  useEffect(() => {
    if (topicParam && topics.length > 0) {
      const topicExists = topics.some(topic => topic.id === topicParam);
      if (topicExists && topicParam !== selectedTopicId) {
        setSelectedTopicId(topicParam);
      } else if (!topicExists) {
        // If topic from URL doesn't exist, fall back to general discussions
        const initialTopicId = 'general-discussions';
        setSelectedTopicId(initialTopicId);
        updateTopicInURL(initialTopicId);
      }
    } else if (topics.length > 0 && !selectedTopicId) {
      // Auto-select general discussions if no topic selected
      const initialTopicId = 'general-discussions';
        setSelectedTopicId(initialTopicId);
          updateTopicInURL(initialTopicId);
        }
  }, [topicParam, topics, selectedTopicId, updateTopicInURL]);

  // Fetch messages for selected topic
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email) {
        return;
      }

      // Skip if already loading
      if (messageStates[selectedTopicId]?.isLoading) {
        return;
      }

      // Skip if messages already loaded for this topic
      if (messageStates[selectedTopicId]?.messages?.length > 0) {
        return;
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
          pageSize: '10',
          chatOnly: 'true',
          sortOrder: 'desc',
        });

        const response = await fetch(
          `/api/tenants/${currentTenantId}/messaging/history?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch message history');
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          console.warn('[ConversationsPage] Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }

        const messages: Message[] = data.map((xiansMsg: any) => ({
          id: xiansMsg.id,
          content: xiansMsg.text,
          role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
          timestamp: xiansMsg.createdAt,
          status: 'delivered' as const,
        })).reverse();

        setMessageStates(prev => ({
            ...prev,
          [selectedTopicId]: {
                messages,
            isLoading: false,
            isLoadingMore: false,
            hasMore: data.length === 10,
            page: 1,
          },
        }));

        updateTopicMessages(selectedTopicId, messages);

        console.log(`[ConversationsPage] Loaded ${messages.length} messages for topic:`, selectedTopicId);
      } catch (error) {
        console.error('[ConversationsPage] Error fetching messages:', error);
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
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email, updateTopicMessages]);

  // Handle sending messages
  const handleSendMessage = async (content: string, topicId: string) => {
    if (!currentTenantId || !agentName || !activationName || !session?.user?.email) {
      console.error('[ConversationsPage] Missing required parameters for sending message');
      showErrorToast(new Error('Missing required parameters'), 'Unable to send message');
      return;
    }

    try {
      const topicParamValue = topicId === 'general-discussions' ? undefined : topicId;

      const requestBody = {
        agentName,
        activationName,
        text: content,
        topic: topicParamValue,
      };

      const response = await fetch(
        `/api/tenants/${currentTenantId}/messaging/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Optimistically add the message to the UI
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: 'delivered',
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

      // Update conversation state (which updates conversation.topics)
      // No need to update topics directly as conversation.topics is what's used in the UI
      addMessageToTopic(topicId, newMessage);

      console.log('[ConversationsPage] Message sent successfully');
    } catch (error) {
      console.error('[ConversationsPage] Error sending message:', error);
      showErrorToast(error, 'Failed to send message');
    }
  };

  // Handle loading more messages
  const handleLoadMoreMessages = useCallback(async () => {
    if (!currentTenantId || !agentName || !activationName || !selectedTopicId || !session?.user?.email) {
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
        pageSize: '10',
        chatOnly: 'true',
        sortOrder: 'desc',
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/messaging/history?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch more messages');
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn('[ConversationsPage] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      const newMessages: Message[] = data.map((xiansMsg: any) => ({
        id: xiansMsg.id,
        content: xiansMsg.text,
        role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
        timestamp: xiansMsg.createdAt,
        status: 'delivered' as const,
      })).reverse();

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
          hasMore: data.length === 10,
          page: nextPage,
        },
      }));

      updateTopicMessages(selectedTopicId, updatedMessages);

      console.log(`[ConversationsPage] Loaded ${uniqueNewMessages.length} more messages for topic:`, selectedTopicId);
    } catch (error) {
      console.error('[ConversationsPage] Error fetching more messages:', error);
      showErrorToast(error, 'Failed to load more messages');
      setMessageStates(prev => ({
        ...prev,
        [selectedTopicId]: {
          ...prev[selectedTopicId],
          isLoadingMore: false,
        },
      }));
    }
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email, messageStates, updateTopicMessages]);

  // Loading state
  if (isLoadingTopics) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-card">
        <div className="h-24 w-24 rounded-3xl bg-primary/20 flex items-center justify-center mb-6 shadow-2xl border border-primary/40">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
          Loading Conversation
        </h2>
        <p className="text-primary/80 max-w-md font-semibold">
          Fetching topics for {activationName || 'agent'}...
        </p>
      </div>
    );
  }

  // No agent selected
  if (!agentName) {
    return (
      <AgentSelectionView
        activations={activations}
        isLoading={isLoadingActivations}
        selectedActivationName={activationName}
        selectedAgentName={agentName}
        onActivationChange={handleActivationChange}
      />
    );
  }

  // No conversation found
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-card">
        <div className="h-28 w-28 rounded-3xl bg-primary/20 flex items-center justify-center mb-8 shadow-2xl border border-primary/40 animate-in fade-in zoom-in duration-500">
          <Bot className="h-14 w-14 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
          No Active Conversation
        </h2>
        <p className="text-primary/80 max-w-md text-base font-semibold">
          {agentName && activationName 
            ? `No topics found for ${activationName}`
            : 'There are no active conversations with this agent'
          }
        </p>
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
        conversation={conversation}
        selectedTopicId={selectedTopicId}
        onTopicSelect={handleTopicSelect}
        onSendMessage={handleSendMessage}
        isLoadingMessages={currentMessageState.isLoading}
        onLoadMoreMessages={handleLoadMoreMessages}
        isLoadingMoreMessages={currentMessageState.isLoadingMore}
        hasMoreMessages={currentMessageState.hasMore}
        unreadCounts={unreadCounts}
            activations={activations}
            selectedActivationName={activationName}
            onActivationChange={handleActivationChange}
            isLoadingActivations={isLoadingActivations}
        agentName={agentName}
        currentPage={currentPage}
        totalPages={totalPages}
        hasMore={hasMore}
        onPageChange={setCurrentPage}
        isConnected={isConnected}
        sseError={sseError}
      />
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
        <ConversationsContent />
      </Suspense>
    </div>
  );
}
