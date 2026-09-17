import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_CONFIG, TaskStatus } from '@/lib/task-status-config';
import { resolveXiansTaskStatus } from '@/lib/task-mapper';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  workflowStatus?: string;
  isCompleted?: boolean;
  performedAction?: string | null;
}

function resolveVisibleStatus({
  status,
  workflowStatus,
  isCompleted,
  performedAction,
}: TaskStatusBadgeProps): TaskStatus {
  if (status === 'obsolete') return 'obsolete';
  if (status === 'rejected' || status === 'approved') return status;
  return resolveXiansTaskStatus({
    status: workflowStatus,
    isCompleted,
    performedAction,
  });
}

export function TaskStatusBadge({
  status,
  className,
  workflowStatus,
  isCompleted,
  performedAction,
}: TaskStatusBadgeProps) {
  const visibleStatus = resolveVisibleStatus({
    status,
    workflowStatus,
    isCompleted,
    performedAction,
  });
  const config = TASK_STATUS_CONFIG[visibleStatus];

  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 font-medium text-[10px] h-6 px-2.5 rounded-lg border',
        config.colors.badge,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
