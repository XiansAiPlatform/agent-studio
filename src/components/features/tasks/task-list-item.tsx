'use client';

import { Task } from '@/lib/data/dummy-tasks';
import { Bot, Clock, Flag, User, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';
import { TASK_STATUS_CONFIG } from '@/lib/task-status-config';
import { TaskStatusBadge } from './task-status-badge';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskListItemProps {
  task: Task;
  onClick: (task: Task) => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  currentUserEmail?: string | null;
}

const priorityColors = {
  low: 'text-gray-600 dark:text-gray-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-orange-600 dark:text-orange-400',
  urgent: 'text-red-600 dark:text-red-400',
};

function decodeText(text: string): string {
  // Replace literal \n with actual newlines
  let decoded = text.replace(/\\n/g, '\n');
  
  // Replace Unicode escape sequences (e.g., \u0060 -> `)
  decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
  
  // Replace other common escape sequences
  decoded = decoded.replace(/\\t/g, '\t');
  decoded = decoded.replace(/\\r/g, '\r');
  
  return decoded;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    if (absDiffHours < 24) {
      return `${absDiffHours}h ago`;
    }
    return `${absDiffDays}d ago`;
  }

  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }
  return `in ${diffDays}d`;
}

export function TaskListItem({ task, onClick, isSelected, isHighlighted, currentUserEmail }: TaskListItemProps) {
  const isCurrentUser = currentUserEmail && task.assignedTo && task.assignedTo.id === currentUserEmail;
  const isRunning = task.content?.data?.workflowStatus === 'Running';
  
  return (
    <div
      onClick={() => onClick(task)}
      className={cn(
        'group relative rounded-xl cursor-pointer transition-all duration-300 ease-out',
        'bg-card border border-border/50 hover:border-border',
        'hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5',
        'overflow-hidden',
        isSelected && 'ring-2 ring-primary/30 border-primary/50 shadow-md shadow-primary/10',
        isHighlighted && 'bg-primary/5 animate-pulse-slow',
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      
      <div className="flex items-start gap-4 p-5">
        {/* Avatar Section */}
        <div className="shrink-0 pt-0.5">
          {task.status === 'pending' && (
            <IconAvatar icon={Bot} variant="agent" size="sm" rounded="full" pulse={isRunning} />
          )}
          {(task.status === 'approved' || task.status === 'rejected') && (
            <IconAvatar icon={User} variant="user" size="sm" rounded="full" />
          )}
          {task.status === 'obsolete' && (
            <IconAvatar icon={Bot} variant="agent" size="sm" rounded="full" />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground leading-snug flex-1 group-hover:text-primary transition-colors">
              {decodeText(task.title)}
            </h3>
            <TaskStatusBadge 
              status={task.status}
              workflowStatus={task.content?.data?.workflowStatus}
              isCompleted={task.content?.data?.isCompleted}
              performedAction={task.content?.data?.performedAction}
            />
          </div>

          {/* Description */}
          <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2 markdown-list-compact">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {decodeText(task.description)}
            </ReactMarkdown>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-1">
            <div className="inline-flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md">
              <Bot className="h-3 w-3" />
              <span className="font-medium text-foreground/80">
                {task.createdBy.name}
              </span>
            </div>

            {task.content?.data?.agentName && (
              <Badge 
                variant="outline" 
                className="text-[10px] h-6 px-2 bg-primary/5 border-primary/30 text-primary font-medium rounded-md"
              >
                {task.content.data.agentName}
              </Badge>
            )}
            
            {task.assignedTo && (
              <div className="inline-flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span className="text-muted-foreground/70">
                  Owner:
                </span>
                {isCurrentUser ? (
                  <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    me
                  </span>
                ) : (
                  <span className="font-medium text-foreground/70">{task.assignedTo.name}</span>
                )}
              </div>
            )}
            
            <div className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>{formatDate(task.createdAt)}</span>
            </div>

            {task.dueDate && (
              <div className={cn('inline-flex items-center gap-1.5 font-medium', priorityColors[task.priority])}>
                <Flag className="h-3 w-3" />
                <span>Due {formatDate(task.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hover Indicator */}
        <div className="shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
