'use client';

import { Message } from '@/types/conversation';
import { FileText, AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import Link from 'next/link';

import { MarkdownMessage, type MarkdownVariant } from './markdown-message';
import { MessageActionsToolbar } from './message-actions-toolbar';
import { MessageFeedbackSummary } from './message-feedback';
import { ChatTaskCard } from './chat-task-card';

interface MessageItemProps {
  message: Message;
  agentName?: string;
  onMessageFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
  /**
   * Hide the "Rate response" action. Existing feedback is still shown as a
   * read-only summary. Used in read-only contexts such as the feedback
   * analytics thread view.
   */
  disableFeedback?: boolean;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// `ml-auto`/`mr-auto` (rather than `self-end`/`self-start` alone) so alignment holds
// even when a caller renders MessageItem outside a flex parent (self-* is a no-op there).
const messageColumnVariants = cva('flex flex-col min-w-0', {
  variants: {
    variant: {
      user: 'items-end gap-1 self-end ml-auto max-w-[70%]',
      agent: 'items-start gap-1.5 self-start mr-auto max-w-[75ch] w-full',
    },
  },
});

const messageBodyVariants = cva('transition-all duration-200 min-w-0 max-w-full', {
  variants: {
    variant: {
      user: 'message-bubble message-bubble--user rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground font-medium',
      agent: 'text-foreground',
    },
  },
});

export function MessageItem({ message, agentName, onMessageFeedbackSubmitted, disableFeedback }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const variant: MarkdownVariant = isUser ? 'user' : 'agent';
  const hasCaption = message.content.trim().length > 0;
  const relatedTaskId = message.taskId || message.contentDraft?.taskId;
  const hasFileAttachments =
    !!message.attachments?.some((attachment) => attachment.type === 'file');
  // Agent File messages with no caption still get a short reply so the bubble
  // is conversational; download stays on a separate icon.
  const displayContent =
    hasCaption
      ? message.content
      : !isUser && hasFileAttachments
        ? 'Your file is ready.'
        : '';
  const hasContent = displayContent.trim().length > 0;

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>{message.content}</span>
          <span className="text-[10px]">{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(messageColumnVariants({ variant }), 'group')}>
      {/* Message Body */}
      <div className={messageBodyVariants({ variant })}>
        {hasContent && <MarkdownMessage content={displayContent} variant={variant} />}

        {/* Attachments — file rows are a reference + download icon; task chips stay cards */}
        {message.attachments && message.attachments.length > 0 && !message.contentDraft && (
          <div className={cn(hasContent && 'mt-3', 'space-y-2')}>
            {message.attachments.map((attachment) => {
              const isFileAttachment = attachment.type === 'file';
              const isDownloadable = isFileAttachment && !!attachment.url;
              const chipClassName = cn(
                'flex items-center gap-2 p-2 rounded border',
                isUser
                  ? 'border-primary-foreground/20'
                  : 'border-border bg-muted/30'
              );

              if (isFileAttachment) {
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <p className="flex-1 min-w-0 text-xs font-medium truncate">
                      {attachment.name}
                    </p>
                    {isDownloadable && (
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        aria-label={`Download ${attachment.name}`}
                        title={`Download ${attachment.name}`}
                        className={cn(
                          'flex-shrink-0 rounded p-1 transition-colors',
                          isUser
                            ? 'hover:bg-primary-foreground/15'
                            : 'hover:bg-accent'
                        )}
                      >
                        <Download className="h-4 w-4 opacity-80" />
                      </a>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={attachment.id}
                  href={`/tasks?task=${encodeURIComponent(attachment.id)}`}
                  className={cn(
                    chipClassName,
                    'transition-colors',
                    isUser
                      ? 'hover:bg-primary-foreground/10'
                      : 'hover:bg-accent'
                  )}
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {attachment.name}
                    </p>
                    <p className="text-[10px] opacity-70">
                      Request
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {relatedTaskId && !isUser && (
        <ChatTaskCard
          taskId={relatedTaskId}
          draftPreview={message.contentDraft?.content}
        />
      )}

      {/* Already-given rating — persistent state, not hover-gated */}
      {!isUser && message.feedback && (
        <div className="px-1">
          <MessageFeedbackSummary feedback={message.feedback} />
        </div>
      )}

      {/* Timestamp + Copy (+ Rate for agent) — hover/focus-revealed */}
      <MessageActionsToolbar
        message={message}
        agentName={agentName}
        timestamp={formatTimestamp(message.timestamp)}
        variant={variant}
        copyText={displayContent || message.content}
        disableFeedback={disableFeedback}
        onMessageFeedbackSubmitted={onMessageFeedbackSubmitted}
      />

      {/* Status Indicator */}
      {isUser && message.status && message.status !== 'delivered' && (
        <div className="text-[10px] text-muted-foreground px-1">
          {message.status === 'sent' && 'Sent'}
          {message.status === 'read' && 'Read'}
        </div>
      )}
    </div>
  );
}
