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
  approve: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  reject: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  hold: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50',
  default: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
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
      <div className={cn("flex items-center gap-1.5", className)}>
        {/* Primary badge: Performed Action */}
        <Badge 
          variant="outline"
          className={cn(
            "shrink-0 font-medium text-[10px] h-6 px-2.5 rounded-lg border",
            getActionColor(performedAction)
          )}
        >
          {performedAction.charAt(0).toUpperCase() + performedAction.slice(1)}
        </Badge>
        {/* Secondary badge: Workflow Status */}
        {workflowStatus && (
          <Badge 
            variant="outline"
            className="shrink-0 font-normal text-[10px] h-6 px-2.5 text-muted-foreground bg-muted/30 rounded-lg"
          >
            {workflowStatus}
          </Badge>
        )}
      </div>
    );
  }

  // If workflow status is provided, show it instead of the mapped status
  if (workflowStatus) {
    // Map "Running" to "Pending" with highlighted styling
    const displayText = workflowStatus === 'Running' ? 'Pending' : workflowStatus;
    const isRunning = workflowStatus === 'Running';
    
    return (
      <Badge 
        variant="outline"
        className={cn(
          "shrink-0 font-medium text-[10px] h-6 px-2.5 rounded-lg",
          isRunning 
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50'
            : 'bg-muted/30',
          className
        )}
      >
        {displayText}
      </Badge>
    );
  }
  
  // Default: show the mapped status
  return (
    <Badge 
      variant="outline"
      className={cn(
        "shrink-0 font-medium text-[10px] h-6 px-2.5 border rounded-lg",
        config.colors.badge,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
