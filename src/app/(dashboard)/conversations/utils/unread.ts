import type { Message } from '@/types/conversation';

/**
 * Messages that belong in the header unread badge.
 * Matches the topic-list rule: agent chat and file only, not tool or reasoning steps.
 */
export function isAgentMessageForUnread(message: Message): boolean {
  if (message.role !== 'agent') return false;
  return message.messageType !== 'tool' && message.messageType !== 'reasoning';
}

/** Agent chat/file message that is still unread, ignoring anything at or before a local cutoff. */
export function isUnreadAgentMessage(message: Message, readCutoff: string | null): boolean {
  if (!isAgentMessageForUnread(message)) return false;
  if (message.readStatus === 'Read') return false;
  if (readCutoff && message.timestamp <= readCutoff) return false;
  return true;
}

export function countUnreadAgentMessages(
  messages: Message[],
  readCutoff: string | null
): number {
  return messages.reduce(
    (count, message) => count + (isUnreadAgentMessage(message, readCutoff) ? 1 : 0),
    0
  );
}
