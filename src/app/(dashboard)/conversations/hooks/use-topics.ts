import { useState, useEffect, useCallback } from 'react';
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

  const fetchTopics = useCallback(async () => {
    if (!tenantId || !agentName || !activationName) {
      return;
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        agentName,
        activationName,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await fetch(
        `/api/tenants/${tenantId}/messaging/topics?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch topics');
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
      console.error('[useTopics] Error fetching topics:', error);
      showErrorToast(error, 'Failed to load conversation topics');
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, agentName, activationName, page, pageSize]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    topics,
    setTopics,
    isLoading,
    totalPages,
    hasMore,
    refetch: fetchTopics,
  };
}
