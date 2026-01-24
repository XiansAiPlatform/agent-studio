'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Task } from '@/lib/data/dummy-tasks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Flag,
  MessageSquare,
  ExternalLink,
  Edit,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { TaskStatusBadge } from './task-status-badge';
import { useTenant } from '@/hooks/use-tenant';
import { showErrorToast, showSuccessToast, showInfoToast } from '@/lib/utils/error-handler';

interface TaskDetailProps {
  task: Task;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
}

type TaskDetailData = {
  taskId: string;
  workflowId: string;
  runId: string;
  title: string;
  description: string;
  initialWork: string | null;
  finalWork: string | null;
  participantId: string;
  status: string;
  isCompleted: boolean;
  availableActions: string[];
  performedAction: string | null;
  comment: string | null;
  startTime: string;
  closeTime: string | null;
  metadata: any;
  agentName: string;
  activationName: string;
  tenantId: string;
};

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
  const { currentTenantId } = useTenant();
  const [taskDetail, setTaskDetail] = useState<TaskDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isEditingInitialWork, setIsEditingInitialWork] = useState(false);
  const [editedInitialWork, setEditedInitialWork] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [editedContent, setEditedContent] = useState({
    proposedAction: task.content.proposedAction || '',
  });

  // Fetch task details
  useEffect(() => {
    const fetchTaskDetail = async () => {
      if (!currentTenantId || !task.content?.data?.workflowId) {
        setIsLoadingDetail(false);
        return;
      }

      setIsLoadingDetail(true);
      try {
        const workflowId = task.content.data.workflowId;
        
        const response = await fetch(
          `/api/tenants/${currentTenantId}/tasks/${encodeURIComponent(workflowId)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || '';
     
          // Workflow doesn't support detailed queries - show info toast and use basic data
          showErrorToast(
            'Limited Task Details',
            errorMessage
          );
          setIsLoadingDetail(false);
          return;
        }

        const data: TaskDetailData = await response.json();
        setTaskDetail(data);
        setEditedInitialWork(data.initialWork || '');
      } catch (error: any) {
        // Only log and show errors for unexpected failures
        console.error('[TaskDetail] Unexpected error:', error);
        showErrorToast(error, 'Failed to load task details');
      } finally {
        setIsLoadingDetail(false);
      }
    };

    fetchTaskDetail();
  }, [currentTenantId, task.content?.data?.workflowId]);


  const handleSave = () => {
    // TODO: Save the edited content
    console.log('Saving edited content:', editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent({
      proposedAction: task.content.proposedAction || '',
    });
    setIsEditing(false);
  };

  const handleSaveInitialWork = async () => {
    if (!currentTenantId || !taskDetail?.workflowId) {
      showErrorToast(new Error('Missing required data'), 'Cannot save draft');
      return;
    }

    if (editedInitialWork.trim() === taskDetail.initialWork?.trim()) {
      // No changes made
      setIsEditingInitialWork(false);
      return;
    }

    setIsSavingDraft(true);
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/tasks/${encodeURIComponent(taskDetail.workflowId)}/draft`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updatedDraft: editedInitialWork,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save draft');
      }

      console.log('[TaskDetail] Draft saved successfully');
      
      // Update the task detail in state
      setTaskDetail({
        ...taskDetail,
        initialWork: editedInitialWork,
      });
      
      setIsEditingInitialWork(false);

      // Show success toast
      showSuccessToast(
        'Draft Saved',
        'The initial work has been updated successfully',
        { icon: '💾' }
      );
    } catch (error) {
      console.error('[TaskDetail] Error saving draft:', error);
      showErrorToast(error, 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancelInitialWork = () => {
    setEditedInitialWork(taskDetail?.initialWork || '');
    setIsEditingInitialWork(false);
  };

  const handleAction = async (action: string) => {
    if (!currentTenantId || !taskDetail?.workflowId) {
      showErrorToast(new Error('Missing required data'), 'Cannot perform action');
      return;
    }

    setIsPerformingAction(true);
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/tasks/${encodeURIComponent(taskDetail.workflowId)}/actions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            comment: actionComment.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to perform action');
      }

      // Show success message
      console.log('[TaskDetail] Action performed successfully:', action);
      
      // Clear comment
      setActionComment('');
      
      // Refresh task details
      const detailResponse = await fetch(
        `/api/tenants/${currentTenantId}/tasks/${encodeURIComponent(taskDetail.workflowId)}`
      );

      if (detailResponse.ok) {
        const updatedData: TaskDetailData = await detailResponse.json();
        setTaskDetail(updatedData);
      }

      // Show success toast
      showSuccessToast(
        'Action Performed',
        `The action "${action}" has been successfully executed`,
        { icon: '✅' }
      );
    } catch (error) {
      console.error('[TaskDetail] Error performing action:', error);
      showErrorToast(error, 'Failed to perform action');
    } finally {
      setIsPerformingAction(false);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading task details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-foreground leading-tight">
          {decodeText(task.title)}
        </h2>
        <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-muted-foreground/70">
          <TaskStatusBadge 
            status={task.status}
            workflowStatus={taskDetail?.status || task.content?.data?.workflowStatus}
            isCompleted={taskDetail?.isCompleted || task.content?.data?.isCompleted}
            performedAction={taskDetail?.performedAction || task.content?.data?.performedAction}
          />
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

      {/* Description */}
      {task.description && (
        <div className="px-4 py-3 rounded-lg bg-muted/30 text-sm text-foreground/90 markdown-preview-compact">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {decodeText(task.description)}
          </ReactMarkdown>
        </div>
      )}

      {/* Initial Work */}
      {taskDetail?.initialWork && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
              Agent's Draft
            </h3>
            {!isEditingInitialWork && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingInitialWork(true)}
                className="h-7 px-2 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {isEditingInitialWork ? (
            <>
              <textarea
                value={editedInitialWork}
                onChange={(e) => setEditedInitialWork(e.target.value)}
                className="w-full min-h-[150px] px-3 py-2.5 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono resize-none"
                placeholder="Edit initial work..."
                disabled={isSavingDraft}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelInitialWork}
                  disabled={isSavingDraft}
                  className="text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveInitialWork}
                  disabled={isSavingDraft}
                  className="text-xs"
                >
                  {isSavingDraft ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  {isSavingDraft ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 bg-muted/30 rounded-lg text-sm text-foreground markdown-preview-compact overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {decodeText(taskDetail.initialWork)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Proposed Action */}
      {task.content.proposedAction && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
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
              className="w-full min-h-[150px] px-3 py-2.5 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 font-mono resize-none"
              placeholder="Edit proposed action..."
            />
          ) : (
            <div className="px-3 py-2.5 bg-muted/30 rounded-lg text-sm text-foreground whitespace-pre-wrap">
              {task.content.proposedAction}
            </div>
          )}
        </div>
      )}

      {/* Related Conversation */}
      {task.conversationId && task.topicId && (
        <Link 
          href={`/conversations?id=${task.conversationId}&topic=${task.topicId}`}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <MessageSquare className="h-3 w-3" />
          View related conversation
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}

      {/* Actions */}
      {((taskDetail?.availableActions && taskDetail.availableActions.length > 0) || 
        (task.content?.data?.availableActions && task.content.data.availableActions.length > 0)) && 
        !taskDetail?.isCompleted && (
        <>
          <div className="h-px bg-border/30 my-5" />
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
                Comment (Optional)
              </h3>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Add a note about this action..."
                className="w-full min-h-[70px] px-3 py-2.5 bg-background border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/50"
                disabled={isPerformingAction}
              />
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">
                Actions
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(taskDetail?.availableActions || task.content?.data?.availableActions || []).map((action: string) => {
                  return (
                    <Button
                      key={action}
                      variant="outline"
                      onClick={() => handleAction(action)}
                      disabled={isPerformingAction}
                      className="text-xs"
                    >
                      {isPerformingAction && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Performed Action */}
      {taskDetail?.performedAction && (
        <div className="px-4 py-3 bg-muted/30 rounded-lg border border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/80 mb-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="font-medium uppercase tracking-wide">Action Performed</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {taskDetail.performedAction}
          </p>
          {taskDetail.comment && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              {taskDetail.comment}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
