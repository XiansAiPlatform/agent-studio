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
 * Constants for the conversations page
 */
export const CONVERSATIONS_CONSTANTS = {
  GENERAL_TOPIC_ID: 'general-discussions',
  GENERAL_TOPIC_NAME: 'General Discussions',
  TOPICS_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 10,
  INITIAL_LOAD_DELAY: 1500,
} as const;
