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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskListItemProps {
  task: Task;
  onClick: (task: Task) => void;
  isSelected?: boolean;
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

export function TaskListItem({ task, onClick, isSelected }: TaskListItemProps) {
  return (
    <div
      onClick={() => onClick(task)}
      className={cn(
        'group relative py-5 px-6 cursor-pointer transition-all duration-200',
        'border-b border-border/40 last:border-b-0',
        'hover:bg-accent/5',
        isSelected && 'bg-accent/10',
        'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:transition-all before:duration-200',
        isSelected 
          ? cn('before:opacity-100', TASK_STATUS_CONFIG[task.status].colors.bar)
          : 'before:opacity-0 before:bg-border'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Prominent Agent & User Avatars */}
        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-2 pt-1 shrink-0">
            {/* Show only User icon for approved/rejected tasks */}
            {(task.status === 'approved' || task.status === 'rejected') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <IconAvatar icon={User} variant="user" size="md" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">{task.status === 'approved' ? 'Approved by' : 'Rejected by'}</p>
                  <p className="text-muted-foreground">{task.assignedTo?.name || 'User'}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Show only Agent icon for obsolete tasks */}
            {task.status === 'obsolete' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <IconAvatar icon={Bot} variant="agent" size="md" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">Obsoleted by Agent</p>
                  <p className="text-muted-foreground">{task.createdBy.name}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Show Agent -> User flow for pending tasks */}
            {task.status === 'pending' && (
              <>
                {/* Agent Avatar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <IconAvatar icon={Bot} variant="agent" size="md" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">Created by Agent</p>
                    <p className="text-muted-foreground">{task.createdBy.name}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Arrow indicating flow */}
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />

                {/* User Avatar - always show for pending tasks */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <IconAvatar icon={User} variant="user" size="md" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{task.assignedTo ? 'Assigned to' : 'Awaiting approval'}</p>
                    <p className="text-muted-foreground">{task.assignedTo?.name || 'User'}</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex items-start justify-between gap-6">
          <div className="flex-1 space-y-3 min-w-0">
            {/* Title */}
            <h3 className="text-base font-medium text-foreground leading-snug tracking-tight">
              {decodeText(task.title)}
            </h3>

            {/* Description */}
            <div className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 markdown-list-compact">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {decodeText(task.description)}
              </ReactMarkdown>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
              <span className="inline-flex items-center gap-1.5">
                <Bot className="h-3 w-3" />
                {task.createdBy.name}
              </span>
              
              <span className="text-muted-foreground/30">•</span>
              
              <span>{formatDate(task.createdAt)}</span>

              {task.dueDate && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className={cn('font-medium', priorityColors[task.priority])}>
                    Due {formatDate(task.dueDate)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 pt-0.5">
            <TaskStatusBadge 
              status={task.status}
              workflowStatus={task.content?.data?.workflowStatus}
              isCompleted={task.content?.data?.isCompleted}
              performedAction={task.content?.data?.performedAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
