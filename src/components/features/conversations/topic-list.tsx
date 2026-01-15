'use client';

import { Topic } from '@/lib/data/dummy-conversations';
import { getTaskById } from '@/lib/data/dummy-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOPIC_STATUS_CONFIG } from '@/lib/conversation-status-config';
import { TaskStatusBadge } from '@/components/features/tasks';

interface TopicListProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: () => void;
}

export function TopicList({
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
}: TopicListProps) {
  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/60 bg-gradient-to-b from-background to-muted/20">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Topics</h2>
          {onCreateTopic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateTopic}
              className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-all group shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 group-hover:scale-110" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          {topics.length} topic{topics.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto">
        {topics.map((topic) => {
          const StatusIcon = TOPIC_STATUS_CONFIG[topic.status].icon;
          const isSelected = topic.id === selectedTopicId;

          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                'w-full text-left px-6 py-4 transition-all duration-200 relative group/topic',
                'border-b border-border/60 last:border-b-0',
                'hover:bg-accent/20 hover:border-border',
                isSelected && 'bg-accent/30 border-border shadow-inner',
                'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:transition-all before:duration-200',
                isSelected 
                  ? 'before:opacity-100 before:bg-primary before:shadow-[2px_0_8px_rgba(var(--primary),0.3)]'
                  : 'before:opacity-0 before:bg-primary/50 group-hover/topic:before:opacity-50'
              )}
            >
              {/* Topic Header */}
              <div className="flex items-start gap-2.5 mb-2">
                <div className={cn(
                  'p-1 rounded-md transition-all duration-200',
                  isSelected && 'bg-primary/10 shadow-sm',
                  'group-hover/topic:bg-primary/10'
                )}>
                  <StatusIcon 
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-all duration-200',
                      TOPIC_STATUS_CONFIG[topic.status].colors.icon,
                      isSelected && 'scale-110',
                      'group-hover/topic:scale-110'
                    )} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm truncate leading-snug transition-colors duration-200",
                    isSelected && "text-foreground font-semibold",
                    !isSelected && "text-foreground/90"
                  )}>
                    {topic.name}
                  </h3>
                  {topic.isDefault && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] mt-1.5 font-medium border-primary/30 text-primary bg-primary/5">
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
                <span className="font-medium">{topic.messages.length} msg</span>
                
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

                <span className="capitalize font-medium">{topic.status}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
