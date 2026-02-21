import { useState, useCallback, useEffect } from 'react';
import { Conversation, Topic, Message } from '@/lib/data/dummy-conversations';
import { XiansMessage } from '@/lib/xians/types';
import { toast } from 'sonner';
import { mapXiansMessageToMessage } from '../utils';

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

  // Initialize or replace conversation when topics/activation changes.
  // Only overwrite when: no conversation yet, or activation changed (different agent/activation).
  // When just adding a topic (same activation), the merge effect preserves loaded messages.
  useEffect(() => {
    if (topics.length > 0) {
      const currentId = `${agentName}-${activationName}`;
      setConversation((prev) => {
        const isInitializing = !prev;
        const isActivationChange = prev && prev.id !== currentId;
        if (isInitializing || isActivationChange) {
          return {
            id: currentId,
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
          };
        }
        return prev;
      });
    }
  }, [topics, agentName, activationName, tenantId]);

  // Update conversation topics when they change.
  // Preserve messages for existing topics - useTopics only has metadata (messages: []),
  // so we must merge to avoid wiping loaded messages when e.g. a new topic is added.
  useEffect(() => {
    setConversation((prev) => {
      if (!prev) return null;
      const prevTopicsById = new Map(prev.topics.map((t) => [t.id, t]));
      const mergedTopics = topics.map((topic) => {
        const prevTopic = prevTopicsById.get(topic.id);
        // Preserve messages from previous state; useTopics never stores them.
        return prevTopic ? { ...topic, messages: prevTopic.messages } : topic;
      });
      return { ...prev, topics: mergedTopics };
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

    const message = mapXiansMessageToMessage(xiansMessage);
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

    // Handle unread counts and notifications - only for Chat messages
    const isChatMessage = (xiansMessage.messageType ?? 'Chat').toLowerCase() === 'chat';
    if (isChatMessage && topicId !== selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] || 0) + 1,
      }));

      const topicName = topicId === 'general-discussions' ? 'General Discussions' : topicId;
      toast.info(`New message in ${topicName}`, {
        description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
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
