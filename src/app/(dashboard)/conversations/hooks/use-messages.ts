import { useState, useCallback } from 'react';
import { Message } from '@/lib/data/dummy-conversations';
import { XiansMessageHistoryResponse } from '@/lib/xians/types';
import { showErrorToast } from '@/lib/utils/error-handler';

interface UseMessagesParams {
  tenantId: string | null;
  agentName: string | null;
  activationName: string | null;
  topicId: string;
}

export function useMessages({
  tenantId,
  agentName,
  activationName,
  topicId,
}: UseMessagesParams) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const fetchMessages = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!tenantId || !agentName || !activationName || !topicId) {
      return;
    }

    const loadingSetter = append ? setIsLoadingMore : setIsLoading;
    loadingSetter(true);

    try {
      const topicParam = topicId === 'general-discussions' ? '' : topicId;

      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        topic: topicParam,
        page: page.toString(),
        pageSize: '10',
        chatOnly: 'true',
        sortOrder: 'desc',
      });

      const response = await fetch(
        `/api/tenants/${tenantId}/messaging/history?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch message history');
      }

      const data: XiansMessageHistoryResponse = await response.json();

      if (!Array.isArray(data)) {
        console.warn('[useMessages] Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      const newMessages: Message[] = data.map((xiansMsg) => ({
        id: xiansMsg.id,
        content: xiansMsg.text,
        role: xiansMsg.direction === 'Incoming' ? 'user' as const : 'agent' as const,
        timestamp: xiansMsg.createdAt,
        status: 'delivered' as const,
      })).reverse();

      if (append) {
        // Prepend new messages, filtering duplicates
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
          return [...uniqueNew, ...prev];
        });
      } else {
        setMessages(newMessages);
        // Mark initial load as complete after a short delay
        setTimeout(() => {
          setInitialLoadComplete(true);
        }, 1500);
      }

      setCurrentPage(page);
      setHasMore(data.length === 10);

      console.log(`[useMessages] Loaded ${newMessages.length} messages for topic:`, topicId);
    } catch (error) {
      console.error('[useMessages] Error fetching messages:', error);
      showErrorToast(error, append ? 'Failed to load more messages' : 'Failed to load messages');
    } finally {
      loadingSetter(false);
    }
  }, [tenantId, agentName, activationName, topicId]);

  const loadMore = useCallback(async () => {
    if (!initialLoadComplete || isLoadingMore) {
      return;
    }
    await fetchMessages(currentPage + 1, true);
  }, [currentPage, fetchMessages, initialLoadComplete, isLoadingMore]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setCurrentPage(1);
    setHasMore(false);
    setInitialLoadComplete(false);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchMessages,
    loadMore,
    addMessage,
    reset,
  };
}
