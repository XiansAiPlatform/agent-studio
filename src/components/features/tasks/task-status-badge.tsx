import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_CONFIG, TaskStatus } from '@/lib/task-status-config';
import { cn } from '@/lib/utils';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_CONFIG[status];
  
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
