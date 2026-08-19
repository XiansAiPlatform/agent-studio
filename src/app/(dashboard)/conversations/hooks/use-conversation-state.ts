import { useState, useCallback, useEffect } from 'react';
import { Conversation, Topic, Message } from '@/types/conversation';
import { XiansMessage } from '@/lib/xians/types';
import { toast } from 'sonner';
import {
  mapXiansMessageToMessage,
  getBackgroundTopicToastDescription,
  mergeMessagesById,
} from '../utils';
import {
  isNoConversationalCapabilityError,
  messagesIndicateNoConversationalCapability,
} from '@/lib/xians/conversational-capability';

interface UseConversationStateParams {
  tenantId: string;
  agentName: string;
  activationName: string;
  workflowType: string;
  topics: Topic[];
  selectedTopicId: string;
  onNoConversationalCapability?: () => void;
}

export function useConversationState({
  tenantId,
  agentName,
  activationName,
  workflowType,
  topics,
  selectedTopicId,
  onNoConversationalCapability,
}: UseConversationStateParams) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Initialize or replace conversation when topics/activation changes.
  // Only overwrite when: no conversation yet, or activation changed (different agent/activation).
  // When just adding a topic (same activation), the merge effect preserves loaded messages.
  useEffect(() => {
    if (topics.length > 0) {
      const currentId = `${agentName}-${activationName}-${workflowType}`;
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
  }, [topics, agentName, activationName, workflowType, tenantId]);

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

    // Missing OnUserChatMessage
    if (
      (!message.messageType || message.messageType === 'chat') &&
      isNoConversationalCapabilityError(message.content)
    ) {
      onNoConversationalCapability?.();
      return;
    }

    // Update conversation state
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id === topicId) {
          // A backfill after an SSE drop can race the live event for the same message.
          if (topic.messages.some((m) => m.id === message.id)) {
            return topic;
          }
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

    // Unread + toast for Chat and File. Reasoning/tool steps stay silent.
    const messageType = (xiansMessage.messageType ?? 'Chat').toLowerCase();
    const notifiesUnread = messageType === 'chat' || messageType === 'file';
    if (notifiesUnread && topicId !== selectedTopicId) {
      setUnreadCounts((prev) => ({
        ...prev,
        [topicId]: (prev[topicId] || 0) + 1,
      }));

      const topicName = topicId === 'general-discussions' ? 'General Discussions' : topicId;
      toast.info(`New message in ${topicName}`, {
        description: getBackgroundTopicToastDescription(message),
        duration: 3000,
      });
    }
  }, [selectedTopicId, onNoConversationalCapability]);

  const updateTopicMessages = useCallback((topicId: string, messages: Message[]) => {
    if (messagesIndicateNoConversationalCapability(messages)) {
      onNoConversationalCapability?.();
    }
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
  }, [onNoConversationalCapability]);

  /**
   * Merge fetched history into a topic without dropping messages that only exist
   * locally (optimistic sends, live SSE events). Used to recover messages that
   * were published while the stream was down.
   */
  const mergeTopicMessages = useCallback((topicId: string, incoming: Message[]) => {
    if (messagesIndicateNoConversationalCapability(incoming)) {
      onNoConversationalCapability?.();
    }
    setConversation((prev) => {
      if (!prev) return null;

      const updatedTopics = prev.topics.map((topic) => {
        if (topic.id !== topicId) return topic;

        // Compare identity, not length: the merge both drops optimistic rows and
        // adds server rows, so a length check misses a one-for-one swap.
        const messages = mergeMessagesById(topic.messages, incoming);
        const unchanged =
          messages.length === topic.messages.length &&
          messages.every((m, i) => m === topic.messages[i]);
        if (unchanged) return topic;

        return {
          ...topic,
          messages,
          lastMessageAt: messages[messages.length - 1]?.timestamp ?? topic.lastMessageAt,
        };
      });

      return {
        ...prev,
        topics: updatedTopics,
      };
    });
  }, [onNoConversationalCapability]);

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

  const applyMessageFeedback = useCallback(
    (topicId: string, messageId: string, feedback: NonNullable<Message['feedback']>) => {
      setConversation((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          topics: prev.topics.map((topic) =>
            topic.id === topicId
              ? {
                  ...topic,
                  messages: topic.messages.map((m) =>
                    m.id === messageId ? { ...m, feedback } : m
                  ),
                }
              : topic
          ),
        };
      });
    },
    []
  );

  return {
    conversation,
    setConversation,
    unreadCounts,
    handleIncomingMessage,
    updateTopicMessages,
    mergeTopicMessages,
    addMessageToTopic,
    applyMessageFeedback,
  };
}
