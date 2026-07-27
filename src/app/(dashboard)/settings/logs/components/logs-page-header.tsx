import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Filter, RefreshCw } from 'lucide-react';

interface LogsPageHeaderProps {
  /** Left-hand title block. Lets the streams view and the drill-in view render very different content (e.g. a back button + breadcrumb-style title) while sharing this row's layout and right-hand controls. */
  titleArea: ReactNode;
  autoRefresh: boolean;
  isRefreshing: boolean;
  refreshTick: number;
  intervalSeconds: number;
  maxDurationMinutes: number;
  onToggleAutoRefresh: () => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
}

export function LogsPageHeader({
  titleArea,
  autoRefresh,
  isRefreshing,
  refreshTick,
  intervalSeconds,
  maxDurationMinutes,
  onToggleAutoRefresh,
  activeFilterCount,
  onOpenFilter,
}: LogsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {titleArea}
      <div className="flex items-center gap-2 sm:shrink-0">
        <Button
          variant="outline"
          onClick={onToggleAutoRefresh}
          aria-pressed={autoRefresh}
          aria-live="polite"
          title={
            autoRefresh
              ? `Auto-refreshing every ${intervalSeconds}s — click to stop (auto-stops after ${maxDurationMinutes} min)`
              : `Click to auto-refresh every ${intervalSeconds} seconds (auto-stops after ${maxDurationMinutes} min)`
          }
          className={cn(
            'relative shrink-0 overflow-hidden rounded-xl',
            autoRefresh &&
              'border-emerald-600/60 text-emerald-700 hover:bg-emerald-600/5 hover:text-emerald-700 focus-visible:ring-emerald-600/30 dark:text-emerald-400 dark:hover:text-emerald-400'
          )}
        >
          {autoRefresh ? (
            isRefreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing…
              </>
            ) : (
              <>
                <span className="relative mr-2 inline-flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </>
            )
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Auto-refresh
            </>
          )}
          {/* Linear progress bar that drains over the interval and snaps
              back when the refresh fires. The `key` forces a clean restart
              of the CSS animation on each tick. */}
          {autoRefresh && (
            <span
              key={refreshTick}
              aria-hidden
              className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/80 animate-autorefresh-drain"
              style={{ ['--autorefresh-duration' as any]: `${intervalSeconds}s` }}
            />
          )}
        </Button>
        <Button variant="outline" onClick={onOpenFilter} className="shrink-0 rounded-xl">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
