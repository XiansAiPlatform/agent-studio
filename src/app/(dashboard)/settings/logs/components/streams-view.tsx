import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Layers } from 'lucide-react';
import { useLogStreams } from '../hooks/use-log-streams';
import { LogStream, LogStreamFilters } from '../types';
import { LogStreamListItem } from './log-stream-list-item';
import { LogsPaginationBar } from './logs-pagination-bar';

interface StreamsViewProps {
  filters: LogStreamFilters;
  currentPage: number;
  enabled: boolean;
  hasActiveFilters: boolean;
  /**
   * Page-driven auto-refresh signal. Each increment of this number triggers
   * a background refetch. `0` (the initial value) is ignored.
   */
  refreshTick: number;
  onPageChange: (page: number) => void;
  onSelectStream: (stream: LogStream) => void;
}

export function StreamsView({
  filters,
  currentPage,
  enabled,
  hasActiveFilters,
  refreshTick,
  onPageChange,
  onSelectStream,
}: StreamsViewProps) {
  const { streams, totalCount, totalPages, isLoading, refetch } = useLogStreams(
    filters,
    enabled
  );

  // Hold `refetch` in a ref so the auto-refresh effect only fires on tick
  // changes — not whenever `refetch`'s identity changes (which happens on
  // every filter/page change and would otherwise cause duplicate fetches).
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (refreshTick === 0 || !enabled) return;
    refetchRef.current();
  }, [refreshTick, enabled]);

  // Only show the full-card loader for the initial load. Background refreshes
  // (filter change, pagination, auto-refresh tick) keep the existing list
  // visible to avoid a jarring flash.
  if (isLoading && streams.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="!px-0 !py-0">
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading log streams...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (streams.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="!px-0 !py-0">
          <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
            <div className="rounded-full bg-muted/50 p-4">
              <Layers className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No log streams found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results'
                  : 'Streams will appear here when agents start executing workflows'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {streams.map((stream) => (
          <LogStreamListItem
            key={stream.workflowId}
            stream={stream}
            onSelect={onSelectStream}
          />
        ))}
      </div>

      <LogsPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemNoun="stream"
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </>
  );
}
