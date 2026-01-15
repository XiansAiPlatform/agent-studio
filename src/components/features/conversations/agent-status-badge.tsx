import { Badge } from '@/components/ui/badge';
import { AGENT_STATUS_CONFIG, AgentStatus } from '@/lib/conversation-status-config';
import { cn } from '@/lib/utils';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  showDot?: boolean;
  className?: string;
}

export function AgentStatusBadge({ status, showDot = false, className }: AgentStatusBadgeProps) {
  const config = AGENT_STATUS_CONFIG[status];
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        "shrink-0 font-normal text-xs capitalize",
        config.colors.badge,
        className
      )}
    >
      {showDot && (
        <span className={cn("inline-block h-2 w-2 rounded-full mr-1.5", config.colors.dot)} />
      )}
      {config.label}
    </Badge>
  );
}
