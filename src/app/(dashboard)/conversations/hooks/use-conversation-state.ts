import { useState, useCallback, useEffect } from 'react';
import { Conversation, Topic, Message } from '@/lib/data/dummy-conversations';
import { XiansMessage } from '@/lib/xians/types';
import { toast } from 'sonner';

interface UseConversationStateParams {
  tenantId: string;
  agentName: string;
  activationName: string;
  topics: Topic[];
  selectedTopicId: string;
}

export function useConversationState({
  tenantId,
  agentName,
  activationName,
  topics,
  selectedTopicId,
}: UseConversationStateParams) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Initialize conversation when topics change
  useEffect(() => {
    if (topics.length > 0) {
      setConversation({
        id: `${agentName}-${activationName}`,
        tenantId,
        user: {
          id: 'current-user',
          name: 'You',
        },
        agent: {
          id: agentName,
          name: agentName,
          status: 'online',
          avatar: undefined,
        },
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        status: 'active',
        topics,
      });
    }
  }, [topics, agentName, activationName, tenantId]);

  // Update conversation topics when they change
  useEffect(() => {
    setConversation((prev) => {
      if (!prev) return null;
      return { ...prev, topics };
    });
  }, [topics]);

  // Clear unread count when topic is selected
  useEffect(() => {
    if (selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [selectedTopicId]: 0,
      }));
    }
  }, [selectedTopicId]);

  const handleIncomingMessage = useCallback((xiansMessage: XiansMessage) => {
    // Only process outgoing messages (from the agent)
    if (xiansMessage.direction !== 'Outgoing') {
      return;
    }

    const message: Message = {
      id: xiansMessage.id,
      content: xiansMessage.text,
      role: 'agent',
      timestamp: xiansMessage.createdAt,
      status: 'delivered',
      taskId: xiansMessage.taskId || undefined,
    };

    const topicId = xiansMessage.scope ?? 'general-discussions';

    // Update conversation state
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id === topicId) {
          return {
            ...topic,
            messages: [...topic.messages, message],
            messageCount: (topic.messageCount ?? 0) + 1,
            lastMessageAt: message.timestamp,
          };
        }
        return topic;
      });

      return {
        ...prev,
        topics: updatedTopics,
      };
    });

    // Handle unread counts and notifications
    if (topicId !== selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] || 0) + 1,
      }));

      const topicName = topicId === 'general-discussions' ? 'General Discussions' : topicId;
      toast.info(`New message in ${topicName}`, {
        description: xiansMessage.text.substring(0, 100) + (xiansMessage.text.length > 100 ? '...' : ''),
        duration: 3000,
      });
    }
  }, [selectedTopicId]);

  const updateTopicMessages = useCallback((topicId: string, messages: Message[]) => {
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id === topicId) {
          return { ...topic, messages };
        }
        return topic;
      });

      return {
        ...prev,
        topics: updatedTopics,
      };
    });
  }, []);

  const addMessageToTopic = useCallback((topicId: string, message: Message) => {
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id === topicId) {
          return {
            ...topic,
            messages: [...topic.messages, message],
            messageCount: (topic.messageCount ?? 0) + 1,
            lastMessageAt: message.timestamp,
          };
        }
        return topic;
      });

      return {
        ...prev,
        topics: updatedTopics,
      };
    });
  }, []);

  return {
    conversation,
    setConversation,
    unreadCounts,
    handleIncomingMessage,
    updateTopicMessages,
    addMessageToTopic,
  };
}
