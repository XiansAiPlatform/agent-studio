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
  Bot,
  Flag,
  MessageSquare,
  ExternalLink,
  Edit,
  Save,
  X,
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
        <h2 className="text-xl font-semibold text-foreground mb-3">
          {task.title}
        </h2>
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <TaskStatusBadge status={task.status} />
          <span className="flex items-center gap-1">
            <Flag className={`h-3 w-3 ${priorityColors[task.priority]}`} />
            {task.priority}
          </span>
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {task.createdBy.name}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(task.createdAt)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Description */}
      {task.description && (
        <div>
          <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
        </div>
      )}

      {/* Proposed Action */}
      {task.content.proposedAction && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Proposed Action
          </h3>
          {isEditing ? (
            <textarea
              value={editedContent.proposedAction}
              onChange={(e) =>
                setEditedContent({
                  ...editedContent,
                  proposedAction: e.target.value,
                })
              }
              className="w-full min-h-[150px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono resize-none"
              placeholder="Edit proposed action..."
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-foreground whitespace-pre-wrap">
              {task.content.proposedAction}
            </div>
          )}
        </div>
      )}

      {/* Reasoning */}
      {task.content.reasoning && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
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
              className="w-full min-h-[100px] p-3 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Edit reasoning..."
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-foreground whitespace-pre-wrap">
              {task.content.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Related Conversation - Simplified */}
      {task.conversationId && task.topicId && (
        <Link 
          href={`/conversations?id=${task.conversationId}&topic=${task.topicId}`}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <MessageSquare className="h-3 w-3" />
          View related conversation
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}

      {/* Escalation Warning */}
      {task.status === 'escalated' && (
        <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-300">
            This task has been escalated and requires immediate attention.
          </p>
        </div>
      )}

      {/* Actions */}
      {canTakeAction && (
        <>
          <Separator />
          {isEditing ? (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSave}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onReject?.(task.id)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => onApprove?.(task.id)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
