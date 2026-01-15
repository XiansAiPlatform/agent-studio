'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Task } from '@/lib/data/dummy-tasks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Bot,
  Calendar,
  Flag,
  Edit,
  Save,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { TaskStatusBadge } from './task-status-badge';

interface TaskDetailProps {
  task: Task;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
}

const priorityColors = {
  low: 'text-gray-600 dark:text-gray-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-orange-600 dark:text-orange-400',
  urgent: 'text-red-600 dark:text-red-400',
};

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
      return `${absDiffHours} hour${absDiffHours === 1 ? '' : 's'} ago`;
    }
    return `${absDiffDays} day${absDiffDays === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  }
  return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

export function TaskDetail({ task, onApprove, onReject }: TaskDetailProps) {
  const canTakeAction = task.status === 'pending' || task.status === 'in-review';
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState({
    proposedAction: task.content.proposedAction || '',
    reasoning: task.content.reasoning || '',
  });

  const handleSave = () => {
    // TODO: Save the edited content
    console.log('Saving edited content:', editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent({
      proposedAction: task.content.proposedAction || '',
      reasoning: task.content.reasoning || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="text-2xl font-semibold text-foreground leading-tight">
            {task.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Description
        </h3>
        <p className="text-foreground">{task.description}</p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Flag className={`h-4 w-4 ${priorityColors[task.priority]}`} />
            <span className="text-muted-foreground">Priority:</span>
            <span className={`font-medium ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Created by:</span>
            <span className="font-medium text-foreground">
              {task.createdBy.name}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium text-foreground">
              {formatDate(task.createdAt)}
            </span>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className="font-medium text-foreground">
                {formatDate(task.dueDate)}
              </span>
            </div>
          )}
        </div>
      </div>

      {task.assignedTo && (
        <div className="flex items-center gap-2 text-sm p-3 bg-muted rounded-md">
          <User className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Assigned to:</span>
          <span className="font-medium text-foreground">
            {task.assignedTo.name}
          </span>
        </div>
      )}

      <Separator />

      {/* Content */}
      <div className="space-y-4">
        {task.conversationId && task.topicId && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Related Conversation
            </h3>
            <Link 
              href={`/conversations?id=${task.conversationId}&topic=${task.topicId}`}
              className="flex items-center gap-2 p-3 bg-muted hover:bg-muted/80 rounded-md text-sm text-foreground transition-colors group"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="flex-1 font-medium">Go to Conversation Topic</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        )}

        {task.content.proposedAction && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Proposed Action
              </h3>
              {canTakeAction && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editedContent.proposedAction}
                onChange={(e) =>
                  setEditedContent({
                    ...editedContent,
                    proposedAction: e.target.value,
                  })
                }
                className="w-full min-h-[200px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                placeholder="Edit proposed action..."
              />
            ) : (
              <div className="p-3 bg-muted rounded-md text-sm text-foreground whitespace-pre-wrap">
                {task.content.proposedAction}
              </div>
            )}
          </div>
        )}

        {task.content.reasoning && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Reasoning
            </h3>
            {isEditing ? (
              <textarea
                value={editedContent.reasoning}
                onChange={(e) =>
                  setEditedContent({
                    ...editedContent,
                    reasoning: e.target.value,
                  })
                }
                className="w-full min-h-[100px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Edit reasoning..."
              />
            ) : (
              <div className="p-3 bg-muted rounded-md text-sm text-foreground whitespace-pre-wrap">
                {task.content.reasoning}
              </div>
            )}
          </div>
        )}

        {task.content.data && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Additional Data
            </h3>
            <div className="p-3 bg-muted rounded-md text-sm text-foreground">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {JSON.stringify(task.content.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canTakeAction && (
        <>
          <Separator />
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onReject?.(task.id)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button className="flex-1" onClick={() => onApprove?.(task.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </>
      )}

      {task.status === 'escalated' && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-900 dark:text-orange-100">
              This task has been escalated
            </p>
            <p className="text-orange-700 dark:text-orange-300 mt-1">
              Requires immediate attention due to high priority or complexity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
