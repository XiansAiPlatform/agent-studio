import { useState, useEffect, useCallback, useRef } from 'react';
import { Topic } from '@/lib/data/dummy-conversations';
import { XiansTopicsResponse } from '@/lib/xians/types';
import { showErrorToast } from '@/lib/utils/error-handler';

interface UseTopicsParams {
  tenantId: string | null;
  agentName: string | null;
  activationName: string | null;
  page?: number;
  pageSize?: number;
}

/** Detects if the error indicates the agent has no conversational/messaging capability */
function isNoConversationalCapabilityError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('not registered') ||
    (normalized.includes('workflow') && normalized.includes('registered workflow types'))
  );
}

export function useTopics({
  tenantId,
  agentName,
  activationName,
  page = 1,
  pageSize = 20,
}: UseTopicsParams) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [noConversationalCapability, setNoConversationalCapability] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTopics = useCallback(async () => {
    if (!tenantId || !agentName || !activationName) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setNoConversationalCapability(false);
    try {
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(
        `/api/tenants/${tenantId}/messaging/topics?${queryParams.toString()}`,
        {
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to fetch topics';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error ?? errorData.message ?? errorMessage;
        } catch {
          errorMessage = `Failed to fetch topics: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data: XiansTopicsResponse = await response.json();
      
      // Update pagination state
      const calculatedTotalPages = Math.ceil(data.pagination.total / data.pagination.pageSize);
      setTotalPages(calculatedTotalPages);
      setHasMore(data.pagination.hasMore);
      
      // Map Xians topics to our Topic format
      const mappedTopics: Topic[] = data.topics.map((topic) => {
        const isGeneralTopic = topic.scope === null;
        const topicId = topic.scope ?? 'general-discussions';
        const topicName = topic.scope ?? 'General Discussions';
        
        return {
          id: topicId,
          name: topicName,
          createdAt: topic.lastMessageAt || new Date().toISOString(),
          status: 'active' as const,
          messages: [],
          associatedTasks: [],
          isDefault: isGeneralTopic,
          messageCount: topic.messageCount ?? 0,
          lastMessageAt: topic.lastMessageAt,
        };
      });

      // Ensure General Discussions topic exists
      const hasGeneralTopic = mappedTopics.some(t => t.isDefault);
      let allTopics = [...mappedTopics];
      
      if (!hasGeneralTopic) {
        const generalTopic: Topic = {
          id: 'general-discussions',
          name: 'General Discussions',
          createdAt: new Date().toISOString(),
          status: 'active' as const,
          messages: [],
          associatedTasks: [],
          isDefault: true,
          messageCount: 0,
          lastMessageAt: undefined,
        };
        allTopics = [generalTopic, ...mappedTopics];
      } else {
        // Sort to ensure General Discussions is first
        allTopics = mappedTopics.sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return 0;
        });
      }
      
      setTopics(allTopics);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[useTopics] Request aborted');
        return;
      }
      
      const message = error instanceof Error ? error.message : String(error);
      if (isNoConversationalCapabilityError(message)) {
        setNoConversationalCapability(true);
        setTopics([]);
        // No toast - we show a friendly inline empty state instead
      } else {
        console.error('[useTopics] Error fetching topics:', error);
        showErrorToast(error, 'Failed to load conversation topics');
        setTopics([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, agentName, activationName, page, pageSize]);

  useEffect(() => {
    fetchTopics();

    // Cleanup function to abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTopics]);

  // Add a new topic to the list (for newly created topics)
  const addTopic = useCallback((newTopic: Topic) => {
    setTopics(prevTopics => {
      // Check if topic already exists
      const exists = prevTopics.some(t => t.id === newTopic.id);
      if (exists) {
        return prevTopics;
      }
      
      // Add new topic after General Discussions
      const generalTopicIndex = prevTopics.findIndex(t => t.isDefault);
      if (generalTopicIndex >= 0) {
        return [
          ...prevTopics.slice(0, generalTopicIndex + 1),
          newTopic,
          ...prevTopics.slice(generalTopicIndex + 1),
        ];
      }
      
      // If no general topic, add at the beginning
      return [newTopic, ...prevTopics];
    });
  }, []);

  return {
    topics,
    setTopics,
    isLoading,
    totalPages,
    hasMore,
    noConversationalCapability,
    refetch: fetchTopics,
    addTopic,
  };
}
