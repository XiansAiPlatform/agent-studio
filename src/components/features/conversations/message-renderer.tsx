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
  disableFeedback?: boolean;
}

/**
 * Routes messages to the appropriate renderer based on messageType.
 * Add ToolMessageItem and ReasoningMessageItem components when implementing those types.
 */
export function MessageRenderer({
  message,
  agentName,
  onMessageFeedbackSubmitted,
  disableFeedback,
}: MessageRendererProps) {
  const type = message.messageType ?? 'chat';

  switch (type) {
    case 'tool':
      return (
        <ToolMessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
          disableFeedback={disableFeedback}
        />
      );
    case 'reasoning':
      return (
        <ReasoningMessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
          disableFeedback={disableFeedback}
        />
      );
    case 'chat':
    default:
      return (
        <MessageItem
          message={message}
          agentName={agentName}
          onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
          disableFeedback={disableFeedback}
        />
      );
  }
}

/** Placeholder for tool execution messages. Replace with full implementation. */
function ToolMessageItem({
  message,
  agentName,
  onMessageFeedbackSubmitted,
  disableFeedback,
}: MessageRendererProps) {
  // For now, render as chat message until ToolMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
      disableFeedback={disableFeedback}
    />
  );
}

/** Placeholder for reasoning/thinking messages. Replace with full implementation. */
function ReasoningMessageItem({
  message,
  agentName,
  onMessageFeedbackSubmitted,
  disableFeedback,
}: MessageRendererProps) {
  // For now, render as chat message until ReasoningMessageItem UI is built
  return (
    <MessageItem
      message={message}
      agentName={agentName}
      onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
      disableFeedback={disableFeedback}
    />
  );
}
