import { Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivationOption } from '../hooks';
import { IconAvatar } from '@/components/ui/icon-avatar';
import { AgentStatusBadge } from '@/components/features/agents';

interface ActivationListItemProps {
  activation: ActivationOption;
  isSelected: boolean;
  onSelect: (name: string, agentName: string) => void;
}

export function ActivationListItem({
  activation,
  isSelected,
  onSelect,
}: ActivationListItemProps) {
  return (
    <button
      onClick={() => onSelect(activation.name, activation.agentName)}
      className={cn(
        "group w-full rounded-lg p-3 text-left transition-all duration-200",
        isSelected 
          ? "bg-muted" 
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Agent Icon with Pulse */}
        <IconAvatar 
          icon={Bot} 
          variant="primary" 
          size="sm" 
          rounded="full"
          pulse={activation.status === 'active'}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {activation.name}
            </h4>
            <AgentStatusBadge 
              status={activation.status}
              size="xs"
              showOnlyWhenActive={true}
            />
          </div>
          {activation.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {activation.description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </button>
  );
}
