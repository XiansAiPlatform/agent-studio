'use client';

import { Message } from '@/lib/data/dummy-conversations';
import { MessageItem } from './message-item';

interface MessageRendererProps {
  message: Message;
  agentName: string;
  userName: string;
}

/**
 * Routes messages to the appropriate renderer based on messageType.
 * Add ToolMessageItem and ReasoningMessageItem components when implementing those types.
 */
export function MessageRenderer({ message, agentName, userName }: MessageRendererProps) {
  const type = message.messageType ?? 'chat';

  switch (type) {
    case 'tool':
      return (
        <ToolMessageItem
          message={message}
          agentName={agentName}
          userName={userName}
        />
      );
    case 'reasoning':
      return (
        <ReasoningMessageItem
          message={message}
          agentName={agentName}
          userName={userName}
        />
      );
    case 'chat':
    default:
      return (
        <MessageItem
          message={message}
          agentName={agentName}
          userName={userName}
        />
      );
  }
}

/** Placeholder for tool execution messages. Replace with full implementation. */
function ToolMessageItem({
  message,
  agentName,
  userName,
}: MessageRendererProps) {
  // For now, render as chat message until ToolMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      userName={userName}
    />
  );
}

/** Placeholder for reasoning/thinking messages. Replace with full implementation. */
function ReasoningMessageItem({
  message,
  agentName,
  userName,
}: MessageRendererProps) {
  // For now, render as chat message until ReasoningMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      userName={userName}
    />
  );
}
