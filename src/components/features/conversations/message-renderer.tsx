'use client';

import { Message } from '@/types/conversation';
import { MessageItem } from './message-item';

interface MessageRendererProps {
  message: Message;
  agentName: string;
  onMessageFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
}

/**
 * Routes messages to the appropriate renderer based on messageType.
 * Add ToolMessageItem and ReasoningMessageItem components when implementing those types.
 */
export function MessageRenderer({ message, agentName, onMessageFeedbackSubmitted }: MessageRendererProps) {
  const type = message.messageType ?? 'chat';

  switch (type) {
    case 'tool':
      return (
        <ToolMessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
        />
      );
    case 'reasoning':
      return (
        <ReasoningMessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
        />
      );
    case 'chat':
    default:
      return (
        <MessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
        />
      );
  }
}

/** Placeholder for tool execution messages. Replace with full implementation. */
function ToolMessageItem({
  message,
  agentName,
  onMessageFeedbackSubmitted,
}: MessageRendererProps) {
  // For now, render as chat message until ToolMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
    />
  );
}

/** Placeholder for reasoning/thinking messages. Replace with full implementation. */
function ReasoningMessageItem({
  message,
  agentName,
  onMessageFeedbackSubmitted,
}: MessageRendererProps) {
  // For now, render as chat message until ReasoningMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
    />
  );
}
