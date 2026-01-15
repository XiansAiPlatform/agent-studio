'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from '@/lib/data/dummy-conversations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, FileText, AlertCircle, ChevronDown, ChevronUp, CheckCircle, XCircle, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            isUser ? 'bg-primary/10' : 'bg-secondary/10'
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
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? (userName || 'You') : (agentName || 'Agent')}
          </span>
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>

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
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                    {message.contentDraft.content}
                  </pre>
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
