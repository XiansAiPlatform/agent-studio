'use client';

import { Topic } from '@/lib/data/dummy-conversations';
import { getTaskById } from '@/lib/data/dummy-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOPIC_STATUS_CONFIG } from '@/lib/conversation-status-config';
import { TaskStatusBadge } from '@/components/features/tasks';
import { AgentActivationSelector, ActivationOption } from './agent-activation-selector';

interface TopicListProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: () => void;
  unreadCounts?: Record<string, number>;
  // Agent activation selector props
  activations?: ActivationOption[];
  selectedAgentName?: string | null;
  selectedActivationName?: string | null;
  onAgentChange?: (agentName: string | null) => void;
  onActivationChange?: (activationName: string, agentName: string) => void;
  isLoadingActivations?: boolean;
  showAgentSelector?: boolean;
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

export function TopicList({
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
  unreadCounts = {},
  // Agent activation selector props
  activations = [],
  selectedAgentName = null,
  selectedActivationName = null,
  onAgentChange,
  onActivationChange,
  isLoadingActivations = false,
  showAgentSelector = false,
}: TopicListProps) {
  return (
    <div className="flex flex-col h-full border-r border-border/20 bg-gradient-to-b from-background to-muted/5 shadow-sm">
      {/* Agent Activation Selector */}
      {showAgentSelector && onAgentChange && onActivationChange && (
        <AgentActivationSelector
          activations={activations}
          selectedAgentName={selectedAgentName}
          selectedActivationName={selectedActivationName}
          onAgentChange={onAgentChange}
          onActivationChange={onActivationChange}
          isLoading={isLoadingActivations}
          defaultExpanded={!selectedActivationName}
        />
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-border/20 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Topics</h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {topics.length} conversation{topics.length !== 1 ? 's' : ''}
            </p>
          </div>
          {onCreateTopic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateTopic}
              className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
            </Button>
          )}
        </div>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto">
        {topics.map((topic) => {
          const StatusIcon = TOPIC_STATUS_CONFIG[topic.status].icon;
          const isSelected = topic.id === selectedTopicId;
          const isGeneralTopic = topic.id === 'general-discussions';
          const unreadCount = unreadCounts[topic.id] || 0;

          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                'w-full text-left px-5 py-4 transition-all duration-300 relative group/topic',
                'border-b border-border/20 last:border-b-0',
                'hover:bg-gradient-to-r hover:from-muted/40 hover:via-muted/30 hover:to-muted/20',
                'hover:border-border/40 hover:shadow-sm',
                isSelected && 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-border/40 shadow-md',
                isGeneralTopic && 'bg-muted/15 border-b border-border/30',
                'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:transition-all before:duration-300',
                isSelected 
                  ? 'before:opacity-100 before:bg-gradient-to-b before:from-primary before:via-primary/80 before:to-primary/60 before:shadow-[2px_0_12px_rgba(var(--primary),0.4)]'
                  : 'before:opacity-0 before:bg-primary/60 group-hover/topic:before:opacity-60'
              )}
            >
              {/* Topic Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className={cn(
                  'p-1.5 rounded-lg transition-all duration-300',
                  isSelected && 'bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm scale-105',
                  'group-hover/topic:bg-gradient-to-br group-hover/topic:from-primary/15 group-hover/topic:to-primary/5',
                  'group-hover/topic:shadow-sm'
                )}>
                  <StatusIcon 
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-all duration-300',
                      TOPIC_STATUS_CONFIG[topic.status].colors.icon,
                      isSelected && 'scale-110',
                      'group-hover/topic:scale-110'
                    )} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-medium text-sm break-words leading-snug transition-colors duration-300",
                      isSelected && "text-foreground font-bold",
                      !isSelected && "text-foreground/90 group-hover/topic:text-foreground"
                    )}>
                      {topic.name}
                    </h3>
                    {unreadCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="h-5 min-w-[20px] px-2 text-[10px] font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground animate-pulse shadow-md"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  {topic.isDefault && (
                    <Badge variant="outline" className="h-5 px-2 text-[10px] mt-1.5 font-semibold border-primary/40 text-primary bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm">
                      Default
                    </Badge>
                  )}
                </div>
              </div>

              {/* Topic Metadata */}
              <div className={cn(
                "flex items-center gap-2 ml-[42px] text-xs transition-colors duration-200",
                isSelected ? "text-muted-foreground" : "text-muted-foreground/80"
              )}>
                <span className="font-medium">{topic.messageCount ?? topic.messages.length} msg</span>
                
                <span className="text-muted-foreground/50">•</span>
                
                {!topic.isDefault && topic.associatedTasks && topic.associatedTasks.length > 0 && (() => {
                  const task = getTaskById(topic.associatedTasks[0]);
                  return task ? (
                    <>
                      <TaskStatusBadge 
                        status={task.status}
                        className="h-4 px-1.5 text-[10px] font-medium"
                      />
                      <span className="text-muted-foreground/50">•</span>
                    </>
                  ) : null;
                })()}

                <span className="font-medium">{formatRelativeTime(topic.lastMessageAt || topic.createdAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
