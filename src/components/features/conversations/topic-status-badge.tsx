import { Badge } from '@/components/ui/badge';
import { TOPIC_STATUS_CONFIG, TopicStatus } from '@/lib/conversation-status-config';
import { cn } from '@/lib/utils';

interface TopicStatusBadgeProps {
  status: TopicStatus;
  showIcon?: boolean;
  className?: string;
}

export function TopicStatusBadge({ status, showIcon = false, className }: TopicStatusBadgeProps) {
  const config = TOPIC_STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        "shrink-0 font-normal text-xs capitalize",
        config.colors.badge,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
