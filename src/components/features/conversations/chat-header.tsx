'use client';

import { Conversation, Topic } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, MoreVertical, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_STATUS_CONFIG } from '@/lib/conversation-status-config';

interface ChatHeaderProps {
  conversation: Conversation;
  selectedTopic: Topic;
  activationName?: string;
}

export function ChatHeader({
  conversation,
  selectedTopic,
  activationName,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-border/30 bg-card shadow-sm flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Agent Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>

        {/* Agent Info */}
        <div>
          <h2 className="font-medium text-foreground tracking-tight">
            {activationName || conversation.agent.name}
          </h2>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-xs text-muted-foreground">
              {conversation.agent.name}
            </span>
            <span className="text-xs text-muted-foreground/50">•</span>
            <Circle
              className={cn(
                'h-2 w-2 fill-current',
                AGENT_STATUS_CONFIG[conversation.agent.status].colors.dot
              )}
            />
            <span className={cn('text-xs', AGENT_STATUS_CONFIG[conversation.agent.status].colors.text)}>
              {AGENT_STATUS_CONFIG[conversation.agent.status].label}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-border/50" />

        {/* Topic Info */}
        <div>
          <h3 className="font-medium text-sm text-foreground">
            {selectedTopic.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground/70">
              Created {new Date(selectedTopic.createdAt).toLocaleDateString()}
            </span>
            {selectedTopic.associatedTasks && selectedTopic.associatedTasks.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground/30">•</span>
                <Badge variant="outline" className="h-5 px-1.5 text-xs font-normal">
                  {selectedTopic.associatedTasks.length} task{selectedTopic.associatedTasks.length !== 1 ? 's' : ''}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Conversation Status */}
        <Badge
          variant={conversation.status === 'active' ? 'default' : 'secondary'}
          className="ml-2 font-normal"
        >
          {conversation.status}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-sm transition-all hover:bg-primary/10 hover:text-primary">
          View Details
        </Button>
        <Button variant="ghost" size="icon" className="transition-all hover:bg-primary/10 hover:text-primary group">
          <MoreVertical className="h-4 w-4 transition-transform group-hover:rotate-90" />
        </Button>
      </div>
    </div>
  );
}
