'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/lib/data/dummy-conversations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, FileText, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MessageItemProps {
  message: Message;
  agentName?: string;
  userName?: string;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function MessageItem({ message, agentName, userName }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [isDraftExpanded, setIsDraftExpanded] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
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
    <div
      className={cn(
        'flex gap-3.5 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-105',
            isUser ? 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20' : 'bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/20'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-primary" />
          ) : (
            <Bot className="h-4 w-4 text-secondary" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name */}
        <div className="flex items-center gap-2 px-1 mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {isUser ? (userName || 'You') : (agentName || 'Agent')}
          </span>
          <span className="text-[10px] text-muted-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-5 py-3 shadow-md border transition-all duration-300 group-hover:shadow-lg',
            isUser
              ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground border-primary/50'
              : 'bg-card text-foreground border-border/50'
          )}
        >
          <div className="text-sm leading-relaxed markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // Customize link styling
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className={cn(
                      'underline hover:opacity-80 transition-opacity',
                      isUser ? 'text-primary-foreground' : 'text-primary'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                // Customize code block styling
                code: ({ node, inline, ...props }) =>
                  inline ? (
                    <code
                      {...props}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono',
                        isUser
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted-foreground/20'
                      )}
                    />
                  ) : (
                    <code
                      {...props}
                      className={cn(
                        'block px-3 py-2 my-2 rounded text-xs font-mono overflow-x-auto',
                        isUser
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted-foreground/20'
                      )}
                    />
                  ),
                // Customize pre block styling (wraps code blocks)
                pre: ({ node, ...props }) => (
                  <pre {...props} className="my-2" />
                ),
                // Ensure proper text color and spacing
                p: ({ node, ...props }) => (
                  <p
                    {...props}
                    className={cn(
                      'my-1',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    {...props}
                    className={cn(
                      'list-disc list-inside my-1 space-y-0.5',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    {...props}
                    className={cn(
                      'list-decimal list-inside my-1 space-y-0.5',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li
                    {...props}
                    className={isUser ? 'text-primary-foreground' : 'text-foreground'}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong
                    {...props}
                    className={cn(
                      'font-bold',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                em: ({ node, ...props }) => (
                  <em
                    {...props}
                    className={isUser ? 'text-primary-foreground italic' : 'text-foreground italic'}
                  />
                ),
                h1: ({ node, ...props }) => (
                  <h1
                    {...props}
                    className={cn(
                      'text-lg font-bold mt-3 mb-2',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                h2: ({ node, ...props }) => (
                  <h2
                    {...props}
                    className={cn(
                      'text-base font-bold mt-2 mb-1',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                h3: ({ node, ...props }) => (
                  <h3
                    {...props}
                    className={cn(
                      'text-sm font-bold mt-2 mb-1',
                      isUser ? 'text-primary-foreground' : 'text-foreground'
                    )}
                  />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    {...props}
                    className={cn(
                      'border-l-2 pl-3 my-2 italic',
                      isUser
                        ? 'border-primary-foreground/40 text-primary-foreground/90'
                        : 'border-muted-foreground/40 text-muted-foreground'
                    )}
                  />
                ),
                hr: ({ node, ...props }) => (
                  <hr
                    {...props}
                    className={cn(
                      'my-2',
                      isUser
                        ? 'border-primary-foreground/30'
                        : 'border-muted-foreground/30'
                    )}
                  />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto my-2">
                    <table
                      {...props}
                      className={cn(
                        'min-w-full border-collapse',
                        isUser ? 'text-primary-foreground' : 'text-foreground'
                      )}
                    />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th
                    {...props}
                    className={cn(
                      'border px-2 py-1 text-left font-semibold',
                      isUser
                        ? 'border-primary-foreground/30 bg-primary-foreground/10'
                        : 'border-border bg-muted/50'
                    )}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td
                    {...props}
                    className={cn(
                      'border px-2 py-1',
                      isUser
                        ? 'border-primary-foreground/30'
                        : 'border-border'
                    )}
                  />
                ),
              }}
            >
            {message.content}
            </ReactMarkdown>
          </div>

          {/* Attachments - Only show if no content draft is present */}
          {message.attachments && message.attachments.length > 0 && !message.contentDraft && (
            <div className="mt-3 space-y-2">
              {message.attachments.map((attachment) => (
                <Link
                  key={attachment.id}
                  href={`/tasks?task=${attachment.id}`}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded border transition-colors',
                    isUser
                      ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                      : 'border-border hover:bg-accent'
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
              ))}
            </div>
          )}
        </div>

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
                <div className="px-4 py-3 max-h-96 overflow-y-auto">
                  <div className="text-sm leading-relaxed markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-primary underline hover:opacity-80 transition-opacity"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        code: ({ node, inline, ...props }) =>
                          inline ? (
                            <code
                              {...props}
                              className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted-foreground/20"
                            />
                          ) : (
                            <code
                              {...props}
                              className="block px-3 py-2 my-2 rounded text-xs font-mono overflow-x-auto bg-muted-foreground/20"
                            />
                          ),
                        pre: ({ node, ...props }) => (
                          <pre {...props} className="my-2" />
                        ),
                        p: ({ node, ...props }) => (
                          <p {...props} className="my-1 text-foreground" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="list-disc list-inside my-1 space-y-0.5 text-foreground" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="list-decimal list-inside my-1 space-y-0.5 text-foreground" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="text-foreground" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-bold text-foreground" />
                        ),
                        em: ({ node, ...props }) => (
                          <em {...props} className="italic text-foreground" />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 {...props} className="text-lg font-bold mt-3 mb-2 text-foreground" />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 {...props} className="text-base font-bold mt-2 mb-1 text-foreground" />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 {...props} className="text-sm font-bold mt-2 mb-1 text-foreground" />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote
                            {...props}
                            className="border-l-2 border-muted-foreground/40 pl-3 my-2 italic text-muted-foreground"
                          />
                        ),
                        hr: ({ node, ...props }) => (
                          <hr {...props} className="my-2 border-muted-foreground/30" />
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-2">
                            <table {...props} className="min-w-full border-collapse text-foreground" />
                          </div>
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            {...props}
                            className="border border-border px-2 py-1 text-left font-semibold bg-muted/50"
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td {...props} className="border border-border px-2 py-1" />
                        ),
                      }}
                    >
                    {message.contentDraft.content}
                    </ReactMarkdown>
                  </div>
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

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Status Indicator */}
        {isUser && message.status && (
          <div className="text-[10px] text-muted-foreground px-1">
            {message.status === 'sent' && 'Sent'}
            {message.status === 'delivered' && 'Delivered'}
            {message.status === 'read' && 'Read'}
          </div>
        )}
      </div>
    </div>
  );
}
