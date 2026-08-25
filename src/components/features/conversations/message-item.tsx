'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/types/conversation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, FileText, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle, Edit, ExternalLink, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import Link from 'next/link';

import { MarkdownMessage, type MarkdownVariant } from './markdown-message';
import { MessageActionsToolbar } from './message-actions-toolbar';
import { MessageFeedbackSummary } from './message-feedback';

interface MessageItemProps {
  message: Message;
  agentName?: string;
  userName?: string;
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

const messageColumnVariants = cva('flex flex-col min-w-0', {
  variants: {
    variant: {
      user: 'items-end gap-1 self-end max-w-[70%]',
      agent: 'items-start gap-1.5 self-start max-w-[75ch] w-full',
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
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);
  const router = useRouter();
  const hasCaption = message.content.trim().length > 0;
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

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent || message.content);
  };

  const handleCopyDraft = () => {
    if (message.contentDraft) {
      navigator.clipboard.writeText(message.contentDraft.content);
    }
  };

  const handleApproveDraft = () => {
    console.log('Approving draft:', message.contentDraft?.id);
    // In a real app, this would send an API request to approve the draft
  };

  const handleRejectDraft = () => {
    console.log('Rejecting draft:', message.contentDraft?.id);
    // In a real app, this would send an API request to reject the draft
  };

  const handleEditDraft = () => {
    if (message.contentDraft?.taskId) {
      router.push(`/tasks?task=${message.contentDraft.taskId}`);
    }
  };

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
                  href={`/tasks?task=${attachment.id}`}
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
                    <p className="text-[10px] opacity-70 capitalize">
                      {attachment.type}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* View Task Link - Show when message has taskId */}
      {message.taskId && !isUser && (
        <Link
          href={`/tasks?task=${message.taskId}`}
          className="mt-3 flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-primary transition-colors group/task"
        >
          <div className="h-8 w-8 rounded-md bg-primary/10 group-hover/task:bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 transition-colors">
            <FileText className="h-4 w-4 text-primary group-hover/task:text-primary-foreground transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground group-hover/task:text-primary-foreground transition-colors">
              View Related Task
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/task:text-primary-foreground transition-colors flex-shrink-0" />
        </Link>
      )}

      {/* Content Draft Section */}
      {message.contentDraft && !isUser && (
        <div className="mt-3 w-full border border-border rounded-lg overflow-hidden bg-background">
          {/* Draft Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">{message.contentDraft.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {message.contentDraft.type}
                  {message.contentDraft.metadata?.subject && (
                    <span className="ml-2">• {message.contentDraft.metadata.subject}</span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDraftExpanded(!isDraftExpanded)}
              className="h-7 px-2"
            >
              {isDraftExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>

          {/* Draft Content */}
          {isDraftExpanded && (
            <>
              {/* Metadata */}
              {message.contentDraft.metadata && (
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <div className="space-y-1 text-xs">
                    {message.contentDraft.metadata.subject && (
                      <div className="flex gap-2">
                        <span className="font-medium text-muted-foreground">Subject:</span>
                        <span>{message.contentDraft.metadata.subject}</span>
                      </div>
                    )}
                    {message.contentDraft.metadata.recipients && (
                      <div className="flex gap-2">
                        <span className="font-medium text-muted-foreground">Recipients:</span>
                        <span>{message.contentDraft.metadata.recipients.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Draft Body */}
              <div className="px-4 py-3 max-h-96 overflow-y-auto overflow-x-hidden min-w-0">
                <MarkdownMessage content={message.contentDraft.content} variant="agent" />
              </div>

              {/* Draft Actions */}
              <div className="px-4 py-3 bg-muted/50 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApproveDraft}
                    className="h-8"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectDraft}
                    className="h-8"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditDraft}
                    className="h-8"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit Draft
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDraft}
                  className="h-8"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
            </>
          )}

          {/* Collapsed Preview Actions */}
          {!isDraftExpanded && (
            <div className="px-4 py-2 flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleApproveDraft}
                className="h-7 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectDraft}
                className="h-7 text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditDraft}
                className="h-7 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>
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
        onCopy={handleCopy}
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
