import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ActivationFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showActiveOnly: boolean;
  onShowActiveOnlyChange: (showActive: boolean) => void;
  totalCount: number;
  activeCount: number;
}

export function ActivationFilter({
  searchQuery,
  onSearchChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  totalCount,
  activeCount,
}: ActivationFilterProps) {
  return (
    <div className="flex gap-2 items-center">
      {/* All/Active Switch */}
      <div className="inline-flex rounded-md border border-border bg-background p-0.5 flex-shrink-0">
        <button
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
            !showActiveOnly 
              ? 'bg-accent text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onShowActiveOnlyChange(false)}
        >
          <span className="flex items-center gap-1.5">
            All
            <span className="text-[10px] opacity-60">
              ({totalCount})
            </span>
          </span>
        </button>
        <button
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
            showActiveOnly 
              ? 'bg-accent text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onShowActiveOnlyChange(true)}
        >
          <span className="flex items-center gap-1.5">
            Active
            <span className="text-[10px] opacity-60">
              ({activeCount})
            </span>
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>
    </div>
  );
}
