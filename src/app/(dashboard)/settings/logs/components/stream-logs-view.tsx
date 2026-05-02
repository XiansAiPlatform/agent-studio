import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, FileText } from 'lucide-react';
import { useLogs } from '../hooks/use-logs';
import { LogFilters } from '../types';
import { LogListItem } from './log-list-item';
import { LogsPaginationBar } from './logs-pagination-bar';

interface StreamLogsViewProps {
  tenantId: string | null;
  filters: LogFilters;
  currentPage: number;
  enabled: boolean;
  hasActiveFilters: boolean;
  /**
   * Page-driven auto-refresh signal. Each increment of this number triggers
   * a background refetch. `0` (the initial value) is ignored.
   */
  refreshTick: number;
  onPageChange: (page: number) => void;
}

export function StreamLogsView({
  tenantId,
  filters,
  currentPage,
  enabled,
  hasActiveFilters,
  refreshTick,
  onPageChange,
}: StreamLogsViewProps) {
  const { logs, totalCount, totalPages, isLoading, refetch } = useLogs(
    tenantId,
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
  if (isLoading && logs.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="!px-0 !py-0">
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading logs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="!px-0 !py-0">
          <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
            <div className="rounded-full bg-muted/50 p-4">
              <FileText className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">No logs found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {hasActiveFilters
                  ? 'Try adjusting your filters to see more results'
                  : 'Logs will appear here when agents emit log entries for this stream'}
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
        {logs.map((log) => (
          <LogListItem key={log.id} log={log} />
        ))}
      </div>

      <LogsPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemNoun="log"
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </>
  );
}
