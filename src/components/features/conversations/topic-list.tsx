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
      <div className="px-6 py-5 border-b border-border/40">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-foreground tracking-tight">Topics</h2>
          {onCreateTopic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateTopic}
              className="h-8 w-8 p-0 hover:bg-accent/50"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70">
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
                'w-full text-left px-6 py-4 transition-all duration-200 relative',
                'border-b border-border/40 last:border-b-0',
                'hover:bg-accent/5',
                isSelected && 'bg-accent/10',
                'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:transition-all before:duration-200',
                isSelected 
                  ? 'before:opacity-100 before:bg-primary'
                  : 'before:opacity-0 before:bg-border'
              )}
            >
              {/* Topic Header */}
              <div className="flex items-start gap-2.5 mb-2">
                <StatusIcon 
                  className={cn(
                    'h-4 w-4 mt-0.5 flex-shrink-0',
                    TOPIC_STATUS_CONFIG[topic.status].colors.icon
                  )} 
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate leading-snug">
                    {topic.name}
                  </h3>
                  {topic.isDefault && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] mt-1.5 font-normal">
                      Default
                    </Badge>
                  )}
                </div>
              </div>

              {/* Topic Metadata */}
              <div className="flex items-center gap-2 ml-6 text-xs text-muted-foreground/70">
                <span>{topic.messages.length} msg</span>
                
                <span className="text-muted-foreground/30">•</span>
                
                {!topic.isDefault && topic.associatedTasks && topic.associatedTasks.length > 0 && (() => {
                  const task = getTaskById(topic.associatedTasks[0]);
                  return task ? (
                    <>
                      <TaskStatusBadge 
                        status={task.status}
                        className="h-4 px-1.5 text-[10px]"
                      />
                      <span className="text-muted-foreground/30">•</span>
                    </>
                  ) : null;
                })()}

                <span className="capitalize">{topic.status}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
