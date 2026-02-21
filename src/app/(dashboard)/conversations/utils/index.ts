/**
 * Determine the topic parameter for API calls
 * General Discussions (id: 'general-discussions') should use empty string
 * Other topics should use their name (same as id)
 */
export function getTopicParam(topicId: string): string {
  return topicId === 'general-discussions' ? '' : topicId;
}

/**
 * Get the display name for a topic
 */
export function getTopicDisplayName(topicId: string): string {
  return topicId === 'general-discussions' ? 'General Discussions' : topicId;
}

/**
 * Check if a topic ID represents the general discussions topic
 */
export function isGeneralTopic(topicId: string): boolean {
  return topicId === 'general-discussions';
}

/**
 * Extract content from XiansMessage.
 * For Chat: content is in `text`.
 * For Reasoning/Tool: content is in `data` (may be JSON-encoded string like "thinking step 1").
 */
function extractContent(xiansMsg: { text?: string; data?: unknown }): string {
  if (xiansMsg.text && xiansMsg.text.trim()) {
    return xiansMsg.text;
  }
  if (xiansMsg.data == null) return '';
  if (typeof xiansMsg.data === 'string') {
    try {
      const parsed = JSON.parse(xiansMsg.data);
      return typeof parsed === 'string' ? parsed : String(xiansMsg.data);
    } catch {
      return xiansMsg.data.replace(/^"|"$/g, '');
    }
  }
  return typeof xiansMsg.data === 'object' ? JSON.stringify(xiansMsg.data) : String(xiansMsg.data);
}

/**
 * Map Xians API message to our Message format.
 * Handles messageType (Reasoning, Tool, Chat) and content from text or data.
 */
export function mapXiansMessageToMessage(
  xiansMsg: {
    id: string;
    direction: string;
    text?: string;
    data?: unknown;
    createdAt: string;
    messageType?: string;
    taskId?: string | null;
  }
): import('@/lib/data/dummy-conversations').Message {
  const content = extractContent(xiansMsg);
  const role = xiansMsg.direction === 'Incoming' ? ('user' as const) : ('agent' as const);
  const rawType = (xiansMsg.messageType ?? 'Chat').toLowerCase();
  const messageType =
    rawType === 'reasoning'
      ? ('reasoning' as const)
      : rawType === 'tool'
        ? ('tool' as const)
        : undefined;

  return {
    id: xiansMsg.id,
    content,
    role,
    timestamp: xiansMsg.createdAt,
    status: 'delivered',
    taskId: xiansMsg.taskId ?? undefined,
    ...(messageType && { messageType }),
  };
}

/**
 * Constants for the conversations page
 */
export const CONVERSATIONS_CONSTANTS = {
  GENERAL_TOPIC_ID: 'general-discussions',
  GENERAL_TOPIC_NAME: 'General Discussions',
  TOPICS_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 10,
  INITIAL_LOAD_DELAY: 1500,
} as const;
