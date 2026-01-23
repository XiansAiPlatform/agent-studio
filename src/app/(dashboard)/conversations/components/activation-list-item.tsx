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
        "group w-full border rounded-lg p-4 text-left transition-all duration-200",
        isSelected 
          ? "bg-primary/10 border-primary shadow-md shadow-primary/10" 
          : "bg-card hover:bg-accent/80 border-border hover:border-primary/60 hover:shadow-md hover:translate-x-1"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
          <Bot className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-foreground truncate transition-colors">
              {activation.name}
            </h4>
            {activation.isActive && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 group-hover:text-emerald-300 flex-shrink-0 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors" />
                Active
              </span>
            )}
          </div>
          {activation.description && (
            <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 line-clamp-1 transition-colors">
              {activation.description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </button>
  );
}
