'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { Topic } from '@/lib/data/dummy-conversations';
import { getTaskById } from '@/lib/data/dummy-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOPIC_STATUS_CONFIG } from '@/lib/conversation-status-config';
import { TaskStatusBadge } from '@/components/features/tasks';
import { AgentActivationSelector, ActivationOption } from './agent-activation-selector';

interface TopicListProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCreateTopic?: (topicName: string) => void;
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
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when creating new topic
  useEffect(() => {
    if (isCreatingTopic && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreatingTopic]);

  const handleCreateClick = () => {
    setIsCreatingTopic(true);
    setNewTopicName('');
  };

  const handleCreateConfirm = () => {
    if (newTopicName.trim() && onCreateTopic) {
      onCreateTopic(newTopicName.trim());
      setIsCreatingTopic(false);
      setNewTopicName('');
    }
  };

  const handleCreateCancel = () => {
    setIsCreatingTopic(false);
    setNewTopicName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCreateCancel();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Agent Activation Selector */}
      {showAgentSelector && onActivationChange && (
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
      <div className="px-6 py-3 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">
              {topics.length} conversation{topics.length !== 1 ? 's' : ''}
            </p>
          </div>
          {onCreateTopic && !isCreatingTopic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateClick}
              className="h-7 w-7 p-0 rounded-lg hover:bg-muted transition-all duration-200"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto">
        {topics.map((topic, index) => {
          const StatusIcon = TOPIC_STATUS_CONFIG[topic.status].icon;
          const isSelected = topic.id === selectedTopicId;
          const isGeneralTopic = topic.id === 'general-discussions';
          const unreadCount = unreadCounts[topic.id] || 0;
          const isLastGeneralTopic = isGeneralTopic && (index === topics.length - 1 || (topics[index + 1] && !topics[index + 1].isDefault));

          return (
            <Fragment key={topic.id}>
              <button
                onClick={() => onSelectTopic(topic.id)}
                className={cn(
                  'w-full text-left px-6 py-3 transition-all duration-200 relative group/topic',
                  'hover:bg-muted/50',
                  isSelected && 'bg-muted',
                  'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:transition-all before:duration-200',
                  isSelected 
                    ? 'before:opacity-100 before:bg-primary'
                    : 'before:opacity-0 before:bg-primary group-hover/topic:before:opacity-50'
                )}
              >
                {/* Topic Content - More textual */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={cn(
                      "font-medium text-sm leading-tight",
                      isSelected && "text-foreground",
                      !isSelected && "text-foreground/90"
                    )}>
                      {topic.name}
                    </h3>
                    {unreadCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold flex-shrink-0"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{topic.messageCount ?? topic.messages.length} messages</span>
                    <span>·</span>
                    <span>{formatRelativeTime(topic.lastMessageAt || topic.createdAt)}</span>
                    {topic.isDefault && (
                      <>
                        <span>·</span>
                        <span className="text-primary text-[10px] font-medium">Default</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Inline topic creation - appears after General Discussions */}
              {isCreatingTopic && isLastGeneralTopic && (
                <div className="w-full px-6 py-3 bg-muted/30 border-l-2 border-primary">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="New conversation name..."
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCreateConfirm}
                        disabled={!newTopicName.trim()}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCreateCancel}
                        className="h-8 w-8 p-0 hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter to create or Esc to cancel
                    </p>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
