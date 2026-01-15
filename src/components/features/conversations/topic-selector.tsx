'use client';

import { Topic } from '@/lib/data/dummy-conversations';
import { getTaskById } from '@/lib/data/dummy-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOPIC_STATUS_CONFIG } from '@/lib/conversation-status-config';
import { TaskStatusBadge } from '@/components/features/tasks';

interface TopicSelectorProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: () => void;
}

export function TopicSelector({
  topics,
  selectedTopicId,
  onSelectTopic,
  onCreateTopic,
}: TopicSelectorProps) {
  return (
    <div className="border-b bg-background">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {/* Topic Tabs */}
        {topics.map((topic) => {
          const StatusIcon = TOPIC_STATUS_CONFIG[topic.status].icon;
          const isSelected = topic.id === selectedTopicId;

          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-all border relative',
                'hover:bg-accent/30',
                isSelected
                  ? 'bg-accent/20 text-foreground border-l-4 border-l-primary border-r border-t border-b border-border/50 rounded-r-lg'
                  : 'text-muted-foreground border border-transparent border-l-4 border-l-transparent rounded-lg'
              )}
            >
              <StatusIcon className={cn('h-4 w-4', TOPIC_STATUS_CONFIG[topic.status].colors.icon)} />
              <span>{topic.name}</span>
              
              {/* Default topic indicator */}
              {topic.isDefault && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] ml-1">
                  Default
                </Badge>
              )}

              {/* Message count */}
              <Badge
                variant="secondary"
                className="h-5 px-1.5 text-xs ml-1"
              >
                {topic.messages.length}
              </Badge>

              {/* Associated task status */}
              {!topic.isDefault && topic.associatedTasks && topic.associatedTasks.length > 0 && (() => {
                const task = getTaskById(topic.associatedTasks[0]);
                return task ? (
                  <TaskStatusBadge 
                    status={task.status}
                    className="h-5 px-1.5 text-xs ml-1"
                  />
                ) : null;
              })()}
            </button>
          );
        })}

        {/* Create New Topic Button */}
        {onCreateTopic && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateTopic}
            className="flex items-center gap-2 px-3 py-2 h-auto text-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Topic
          </Button>
        )}
      </div>
    </div>
  );
}
