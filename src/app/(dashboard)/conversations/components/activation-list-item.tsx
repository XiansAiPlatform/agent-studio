import { Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivationOption } from '../hooks';

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
        {/* Icon */}
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {activation.name}
            </h4>
            {activation.isActive && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
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
