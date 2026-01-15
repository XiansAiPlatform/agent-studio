'use client';

import { Conversation } from '@/lib/data/dummy-conversations';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Bot, Clock, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_STATUS_CONFIG } from '@/lib/conversation-status-config';

interface ConversationListItemProps {
  conversation: Conversation;
  onClick: (conversation: Conversation) => void;
  isSelected?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function ConversationListItem({ 
  conversation, 
  onClick, 
  isSelected 
}: ConversationListItemProps) {
  const totalMessages = conversation.topics.reduce(
    (sum, topic) => sum + topic.messages.length,
    0
  );

  const lastMessage = conversation.topics
    .flatMap(topic => topic.messages)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  return (
    <div
      onClick={() => onClick(conversation)}
      className={cn(
        'flex items-start gap-3 p-4 border transition-all cursor-pointer relative',
        'hover:bg-accent/30',
        isSelected
          ? 'bg-accent/20 border-l-4 border-l-primary border-r border-t border-b border-border/50 rounded-r-lg text-foreground'
          : 'bg-card border-border border-l-4 border-l-transparent rounded-lg'
      )}
    >
      {/* Agent Avatar with Status */}
      <div className="relative flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
            AGENT_STATUS_CONFIG[conversation.agent.status].colors.dot
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {conversation.agent.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              with {conversation.user.name}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(conversation.lastActivity)}</span>
          </div>
        </div>

        {/* Last Message Preview */}
        {lastMessage && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {lastMessage.role === 'user' ? 'You: ' : ''}
            {lastMessage.content}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{totalMessages} messages</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{conversation.topics.length} topics</span>
          </div>
          <Badge
            variant={conversation.status === 'active' ? 'default' : 'secondary'}
            className="text-xs h-5 capitalize"
          >
            {conversation.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
