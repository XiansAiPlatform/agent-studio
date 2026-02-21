'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Bot } from 'lucide-react';
import { useTenant } from '@/hooks/use-tenant';
import { useMessageListener } from '@/hooks/use-message-listener';
import { showErrorToast } from '@/lib/utils/error-handler';
import { toast } from 'sonner';
import { Message, Topic } from '@/lib/data/dummy-conversations';
import { useActivations, useTopics, useConversationState } from '../../hooks';
import { getTopicParam } from '../../utils';
import { MessageStatesMap, TopicMessageState } from '../../types';
import type { FileUploadPayload } from '@/components/features/conversations';
import { ConversationView } from '../../_components';

/**
 * Conversation Page
 * 
 * This page displays the conversation interface for a specific agent activation.
 * It shows a list of topics on the left and the chat interface on the right.
 * 
 * Route: /conversations/[agentName]/[activationName]
 * Query params: ?topic=<topicId>
 */
function ConversationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const { currentTenantId } = useTenant();
  const { data: session } = useSession();
  
  // Get route parameters
  const agentName = decodeURIComponent(params.agentName as string);
  const activationName = decodeURIComponent(params.activationName as string);
  const topicParam = searchParams.get('topic');

  // State
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [messageStates, setMessageStates] = useState<MessageStatesMap>({});
  const [lastActivationKey, setLastActivationKey] = useState<string>('');
  
  // Ref for chat input to focus after topic creation or activation change
  const chatInputRef = useRef<HTMLInputElement>(null);
  const hasAutoFocusedRef = useRef(false);

  // Fetch activations (for switching between agents)
  const { activations, isLoading: isLoadingActivations } = useActivations(currentTenantId);

  // Fetch topics
  const {
    topics,
    setTopics,
    isLoading: isLoadingTopics,
    totalPages,
    hasMore,
    addTopic,
    refetch: refetchTopics,
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
  const { isConnected, error: sseError, maxReconnectAttemptsReached } = useMessageListener({
    tenantId: currentTenantId,
    agentName,
    activationName,
    enabled: !!(currentTenantId && agentName && activationName && session?.user?.email && isActivationActive),
    onMessage: handleIncomingMessage,
    onError: handleSSEError,
    onConnect: handleSSEConnect,
    onDisconnect: handleSSEDisconnect,
  });

  // Redirect to server unavailable page if max reconnection attempts reached
  useEffect(() => {
    if (maxReconnectAttemptsReached) {
      const currentUrl = `/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?${searchParams.toString()}`;
      const errorMessage = sseError?.message || 'Failed to establish connection to the real-time messaging server after multiple attempts';
      const params = new URLSearchParams({
        error: errorMessage,
        returnUrl: currentUrl,
      });
      router.push(`/server-unavailable?${params.toString()}`);
    }
  }, [maxReconnectAttemptsReached, sseError, searchParams, router, agentName, activationName]);

  // Handle activation change (navigate to different agent/activation)
  const handleActivationChange = useCallback((newActivationName: string, newAgentName: string) => {
    router.push(`/conversations/${encodeURIComponent(newAgentName)}/${encodeURIComponent(newActivationName)}?topic=general-discussions`);
  }, [router]);

  // Update URL when topic is selected
  const updateTopicInURL = useCallback((topicId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (topicId) {
      params.set('topic', topicId);
    } else {
      params.delete('topic');
    }
    router.push(`/conversations/${encodeURIComponent(agentName)}/${encodeURIComponent(activationName)}?${params.toString()}`, { scroll: false });
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
    if (!currentTenantId || !agentName || !activationName) {
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
      });

      const response = await fetch(
        `/api/tenants/${currentTenantId}/messaging/messages?${queryParams.toString()}`,
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
      }

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
  }, [currentTenantId, agentName, activationName, selectedTopicId, updateTopicInURL, refetchTopics]);

  // Handle topic selection
  const handleTopicSelect = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    updateTopicInURL(topicId);
    
    // Focus the chat input after topic selection
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  }, [updateTopicInURL]);

  // Clear message states when activation or agent changes
  useEffect(() => {
    const activationKey = `${agentName}-${activationName}`;
    if (activationKey !== lastActivationKey && lastActivationKey !== '') {
      console.log('[ConversationPage] Activation changed, clearing message states');
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

  // Auto-focus chat input when activation changes and topic is selected
  useEffect(() => {
    // Only auto-focus once per activation load
    if (selectedTopicId && !isLoadingTopics && chatInputRef.current && !hasAutoFocusedRef.current) {
      // Add a small delay to ensure the chat interface is fully rendered
      const timeoutId = setTimeout(() => {
        chatInputRef.current?.focus();
        hasAutoFocusedRef.current = true;
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedTopicId, isLoadingTopics]);

  // Reset auto-focus flag when activation changes
  useEffect(() => {
    const activationKey = `${agentName}-${activationName}`;
    return () => {
      hasAutoFocusedRef.current = false;
    };
  }, [agentName, activationName]);

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

      // Skip if we've already attempted to fetch for this topic (even if no messages)
      if (messageStates[selectedTopicId] !== undefined) {
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
          console.warn('[ConversationPage] Invalid response format:', data);
          throw new Error('Invalid response format from server');
        }

        const messages: Message[] = data.map((xiansMsg: any) => ({
          id: xiansMsg.id,
          content: xiansMsg.text,
          role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
          timestamp: xiansMsg.createdAt,
          status: 'delivered' as const,
          taskId: xiansMsg.taskId,
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
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email, updateTopicMessages]);

  // Handle sending messages
  const handleSendMessage = async (content: string, topicId: string) => {
    if (!currentTenantId || !agentName || !activationName || !session?.user?.email) {
      console.error('[ConversationPage] Missing required parameters for sending message');
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

      // Update conversation state
      addMessageToTopic(topicId, newMessage);

      console.log('[ConversationPage] Message sent successfully');
    } catch (error) {
      console.error('[ConversationPage] Error sending message:', error);
      showErrorToast(error, 'Failed to send message');
    }
  };

  // Handle sending file uploads (type=File per messaging doc)
  const handleSendFile = async (file: FileUploadPayload, topicId: string) => {
    if (!currentTenantId || !agentName || !activationName || !session?.user?.email) {
      console.error('[ConversationPage] Missing required parameters for file upload');
      showErrorToast(new Error('Missing required parameters'), 'Unable to upload file');
      return;
    }

    try {
      const topicParamValue = topicId === 'general-discussions' ? undefined : topicId;

      const requestBody = {
        agentName,
        activationName,
        type: 'File',
        text: file.fileName,
        topic: topicParamValue,
        data: {
          content: file.base64,
          fileName: file.fileName,
          contentType: file.contentType,
          ...(file.fileSize != null && { fileSize: file.fileSize }),
        },
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
        throw new Error('Failed to upload file');
      }

      // Optimistically add the file message to the UI
      const newMessage: Message = {
        id: `temp-file-${Date.now()}`,
        content: file.fileName,
        role: 'user',
        timestamp: new Date().toISOString(),
        status: 'delivered',
        attachments: [{ type: 'file', id: `file-${Date.now()}`, name: file.fileName }],
      };

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

      addMessageToTopic(topicId, newMessage);

      console.log('[ConversationPage] File uploaded successfully');
    } catch (error) {
      console.error('[ConversationPage] Error uploading file:', error);
      showErrorToast(error, 'Failed to upload file');
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
        console.warn('[ConversationPage] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      const newMessages: Message[] = data.map((xiansMsg: any) => ({
        id: xiansMsg.id,
        content: xiansMsg.text,
        role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
        timestamp: xiansMsg.createdAt,
        status: 'delivered' as const,
        taskId: xiansMsg.taskId,
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
  }, [currentTenantId, agentName, activationName, selectedTopicId, session?.user?.email, messageStates, updateTopicMessages]);

  // Loading state
  if (isLoadingTopics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading conversation...
        </p>
      </div>
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
        onSendFile={handleSendFile}
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
        onCreateTopic={handleCreateTopic}
        onDeleteTopic={handleDeleteTopic}
        chatInputRef={chatInputRef}
      />
    </div>
  );
}

export default function ConversationPage() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ConversationContent />
      </Suspense>
    </div>
  );
}
