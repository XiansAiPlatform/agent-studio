import { Badge } from '@/components/ui/badge';
import { AGENT_STATUS_CONFIG, AgentStatus } from '@/lib/agent-status-config';
import { cn } from '@/lib/utils';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  /**
   * Size of the badge
   * @default 'default'
   */
  size?: 'xs' | 'sm' | 'default';
  /**
   * Whether to show a status indicator dot
   * @default false
   */
  showDot?: boolean;
  /**
   * Whether to only show the badge when status is active
   * @default false
   */
  showOnlyWhenActive?: boolean;
  /**
   * Custom className to apply to the badge
   */
  className?: string;
  /**
   * Custom label to display instead of the default status label
   */
  customLabel?: string;
}

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0 h-4',
  sm: 'text-xs px-2 py-0.5 h-5',
  default: 'text-xs px-2.5 py-1',
};

export function AgentStatusBadge({
  status,
  size = 'default',
  showDot = false,
  showOnlyWhenActive = false,
  className,
  customLabel,
}: AgentStatusBadgeProps) {
  const config = AGENT_STATUS_CONFIG[status];

  // If showOnlyWhenActive is true and status is not active, don't render
  if (showOnlyWhenActive && status !== 'active') {
    return null;
  }

  const label = customLabel || config.label;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        config.colors.badge,
        'font-medium',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
            status === 'active' && 'bg-green-500',
            status === 'inactive' && 'bg-yellow-500',
            status === 'error' && 'bg-red-500'
          )}
        />
      )}
      {label}
    </Badge>
  );
}
