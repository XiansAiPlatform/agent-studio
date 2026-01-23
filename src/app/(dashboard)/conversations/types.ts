import { Message } from '@/lib/data/dummy-conversations';

/**
 * Message state for a specific topic
 */
export interface TopicMessageState {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
}

/**
 * Record of message states indexed by topic ID
 */
export type MessageStatesMap = Record<string, TopicMessageState>;
