import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SelectedActivation, LogLevel } from '../types';

interface ActiveFiltersBarProps {
  selectedActivation: SelectedActivation | null;
  selectedLogLevels: LogLevel[];
  startDate: string | null;
  endDate: string | null;
  onClearFilter: (type: 'activation' | 'logLevel' | 'dateRange') => void;
  onClearAll: () => void;
}

/** Row of removable chips summarizing the currently applied log filters. */
export function ActiveFiltersBar({
  selectedActivation,
  selectedLogLevels,
  startDate,
  endDate,
  onClearFilter,
  onClearAll,
}: ActiveFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-xs text-muted-foreground font-medium">Active filters:</span>

      {selectedActivation && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
          onClick={() => onClearFilter('activation')}
        >
          {selectedActivation.activationName}
          <X className="ml-1.5 h-3 w-3" />
        </Badge>
      )}

      {selectedLogLevels.length > 0 && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
          onClick={() => onClearFilter('logLevel')}
        >
          {selectedLogLevels.length} level{selectedLogLevels.length > 1 ? 's' : ''}
          <X className="ml-1.5 h-3 w-3" />
        </Badge>
      )}

      {(startDate || endDate) && (
        <Badge
          variant="secondary"
          className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
          onClick={() => onClearFilter('dateRange')}
        >
          Date range
          <X className="ml-1.5 h-3 w-3" />
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 px-2 text-xs hover:bg-muted/60"
      >
        Clear all
      </Button>
    </div>
  );
}
