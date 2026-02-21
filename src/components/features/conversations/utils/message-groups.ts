import { Message } from '@/lib/data/dummy-conversations';

export type MessageGroupType = 'user' | 'system' | 'agent-chat' | 'progress-block';

export interface MessageGroup {
  type: MessageGroupType;
  message?: Message;
  messages?: Message[];
  /** True when this progress block is currently streaming (no agent chat response yet) */
  isActive?: boolean;
}

function isProgressMessage(m: Message): boolean {
  const type = m.messageType?.toLowerCase();
  return m.role === 'agent' && (type === 'reasoning' || type === 'tool');
}

/**
 * Groups messages into turns with progress blocks.
 * Progress messages (reasoning, tool) between a user message and agent chat response
 * are grouped into a collapsible block.
 */
export function groupMessages(messages: Message[], isTyping: boolean): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let progressBuffer: Message[] = [];

  const flushProgress = (active: boolean) => {
    if (progressBuffer.length > 0) {
      groups.push({
        type: 'progress-block',
        messages: [...progressBuffer],
        isActive: active,
      });
      progressBuffer = [];
    }
  };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === 'user' || msg.role === 'system') {
      flushProgress(false);
      groups.push({
        type: msg.role === 'user' ? 'user' : 'system',
        message: msg,
      });
      continue;
    }

    if (msg.role === 'agent') {
      if (isProgressMessage(msg)) {
        progressBuffer.push(msg);
      } else {
        // Agent chat message
        const isLastMessage = i === messages.length - 1;
        flushProgress(false);
        groups.push({
          type: 'agent-chat',
          message: msg,
        });
      }
    }
  }

  // Remaining progress messages (streaming or orphaned)
  if (progressBuffer.length > 0) {
    groups.push({
      type: 'progress-block',
      messages: progressBuffer,
      isActive: isTyping,
    });
  }

  return groups;
}
