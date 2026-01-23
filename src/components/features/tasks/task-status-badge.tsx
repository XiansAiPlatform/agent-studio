import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_CONFIG, TaskStatus } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
  workflowStatus?: string;
  isCompleted?: boolean;
  performedAction?: string | null;
}

const actionColors = {
  approve: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  reject: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  default: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
};

function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('approve')) return actionColors.approve;
  if (lowerAction.includes('reject')) return actionColors.reject;
  if (lowerAction.includes('hold')) return actionColors.hold;
  return actionColors.default;
}

export function TaskStatusBadge({ 
  status, 
  className, 
  workflowStatus,
  isCompleted,
  performedAction
}: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status];
  
  // If task is completed and has a performedAction, show both badges
  if (isCompleted && performedAction) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Primary badge: Performed Action */}
        <Badge 
          variant="secondary"
          className={cn(
            "shrink-0 font-medium text-xs",
            getActionColor(performedAction)
          )}
        >
          {performedAction.charAt(0).toUpperCase() + performedAction.slice(1)}
        </Badge>
        {/* Secondary badge: Workflow Status */}
        {workflowStatus && (
          <Badge 
            variant="outline"
            className="shrink-0 font-normal text-xs text-muted-foreground"
          >
            {workflowStatus}
          </Badge>
        )}
      </div>
    );
  }

  // If workflow status is provided, show it instead of the mapped status
  if (workflowStatus) {
    return (
      <Badge 
        variant="outline"
        className={cn(
          "shrink-0 font-normal text-xs",
          className
        )}
      >
        {workflowStatus}
      </Badge>
    );
  }
  
  // Default: show the mapped status
  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        "shrink-0 font-normal text-xs",
        config.colors.badge,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
