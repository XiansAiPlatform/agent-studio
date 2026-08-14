import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Layers, ChevronRight, Bot, Workflow } from 'lucide-react';
import { useLogStreams } from '../hooks/use-log-streams';
import { LogStream, LogStreamFilters } from '../types';
import { LogStreamListItem } from './log-stream-list-item';
import { LogsPaginationBar } from './logs-pagination-bar';

const UNGROUPED_KEY = '\u0000';

interface WorkflowGroup {
  key: string;
  label: string;
  streams: LogStream[];
}

interface ActivationGroup {
  key: string;
  label: string;
  streamCount: number;
  workflowGroups: WorkflowGroup[];
}

interface AgentGroup {
  key: string;
  label: string;
  streamCount: number;
  activationGroups: ActivationGroup[];
}

/**
 * Builds a 3-level Agent -> Activation -> Workflow hierarchy out of the
 * (already recency-sorted) streams on the current page. Insertion-ordered
 * Maps preserve that recency ordering at every level without extra sorting.
 */
function buildStreamHierarchy(streams: LogStream[]): AgentGroup[] {
  const agentMap = new Map<
    string,
    {
      label: string;
      activationMap: Map<string, { label: string; workflowMap: Map<string, WorkflowGroup> }>;
    }
  >();

  for (const stream of streams) {
    const agentKey = stream.agent || UNGROUPED_KEY;
    if (!agentMap.has(agentKey)) {
      agentMap.set(agentKey, { label: stream.agent || 'Unknown agent', activationMap: new Map() });
    }
    const agentEntry = agentMap.get(agentKey)!;

    const activationKey = stream.activation || UNGROUPED_KEY;
    if (!agentEntry.activationMap.has(activationKey)) {
      agentEntry.activationMap.set(activationKey, {
        label: stream.activation || 'No activation',
        workflowMap: new Map(),
      });
    }
    const activationEntry = agentEntry.activationMap.get(activationKey)!;

    const workflowKey = stream.workflowType || UNGROUPED_KEY;
    if (!activationEntry.workflowMap.has(workflowKey)) {
      activationEntry.workflowMap.set(workflowKey, {
        key: `${agentKey}\u0001${activationKey}\u0001${workflowKey}`,
        label: stream.workflowType || 'Unknown workflow',
        streams: [],
      });
    }
    activationEntry.workflowMap.get(workflowKey)!.streams.push(stream);
  }

  return Array.from(agentMap.entries()).map(([agentKey, agentEntry]) => {
    const activationGroups: ActivationGroup[] = Array.from(
      agentEntry.activationMap.entries()
    ).map(([activationKey, activationEntry]) => {
      const workflowGroups = Array.from(activationEntry.workflowMap.values());
      const streamCount = workflowGroups.reduce((sum, w) => sum + w.streams.length, 0);
      return {
        key: `${agentKey}\u0001${activationKey}`,
        label: activationEntry.label,
        streamCount,
        workflowGroups,
      };
    });
    const streamCount = activationGroups.reduce((sum, a) => sum + a.streamCount, 0);
    return { key: agentKey, label: agentEntry.label, streamCount, activationGroups };
  });
}

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
  const [isGrouped, setIsGrouped] = useState(false);
  // Collapsed agent/activation group keys. Empty by default = everything expanded.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const agentGroups = useMemo(
    () => (isGrouped ? buildStreamHierarchy(streams) : null),
    [streams, isGrouped]
  );

  const toggleCollapsed = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const collapseAll = () => {
    if (!agentGroups) return;
    const keys = new Set<string>();
    for (const agent of agentGroups) {
      keys.add(agent.key);
      for (const activation of agent.activationGroups) keys.add(activation.key);
    }
    setCollapsedKeys(keys);
  };

  const expandAll = () => setCollapsedKeys(new Set());

  // Hold `refetch` in a ref so the auto-refresh effect only fires on tick
  // changes — not whenever `refetch`'s identity changes (which happens on
  // every filter/page change and would otherwise cause duplicate fetches).
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (refreshTick === 0 || !enabled) return;
    refetchRef.current();
  }, [refreshTick, enabled]);

  const groupByToolbar = (
    <div className="flex items-center justify-end gap-3">
      {isGrouped && (
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted/60"
          >
            Expand all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted/60"
          >
            Collapse all
          </Button>
        </div>
      )}
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>Group by agent / activation / workflow</span>
        <Switch checked={isGrouped} onCheckedChange={setIsGrouped} />
      </label>
    </div>
  );

  // Only show the full-card loader for the initial load. Background refreshes
  // (filter change, pagination, auto-refresh tick) keep the existing list
  // visible to avoid a jarring flash.
  if (isLoading && streams.length === 0) {
    return (
      <>
        {groupByToolbar}
        <Card className="border-border/50">
          <CardContent className="!px-0 !py-0">
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading log streams...</p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (streams.length === 0) {
    return (
      <>
        {groupByToolbar}
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
      </>
    );
  }

  return (
    <>
      {groupByToolbar}

      {agentGroups ? (
        <div className="space-y-3">
          {agentGroups.map((agent) => {
            const agentCollapsed = collapsedKeys.has(agent.key);
            return (
              <Card key={agent.key} className="border-border/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(agent.key)}
                  className="flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 sm:px-4"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      agentCollapsed ? '' : 'rotate-90'
                    }`}
                  />
                  <Bot className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">
                    {agent.label}
                  </span>
                  <Badge variant="secondary" className="h-5 min-w-5 shrink-0 rounded-full px-1.5 text-[10px]">
                    {agent.streamCount}
                  </Badge>
                </button>

                {!agentCollapsed && (
                  <CardContent className="!px-3.5 !pb-3.5 !pt-0 sm:!px-4 sm:!pb-4">
                    <div className="ml-6 space-y-2 border-l border-border/60 pl-3.5">
                      {agent.activationGroups.map((activation) => {
                        const activationCollapsed = collapsedKeys.has(activation.key);
                        return (
                          <div key={activation.key} className="space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleCollapsed(activation.key)}
                              className="flex w-full items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 text-left transition-colors hover:bg-muted/40"
                            >
                              <ChevronRight
                                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform ${
                                  activationCollapsed ? '' : 'rotate-90'
                                }`}
                              />
                              <span className="flex-1 truncate text-xs font-medium text-foreground/90">
                                {activation.label}
                              </span>
                              <Badge
                                variant="outline"
                                className="h-4.5 min-w-4.5 shrink-0 rounded-full px-1.5 text-[10px] text-muted-foreground"
                              >
                                {activation.streamCount}
                              </Badge>
                            </button>

                            {!activationCollapsed && (
                              <div className="ml-5 space-y-3 border-l border-border/40 pl-3.5">
                                {activation.workflowGroups.map((workflow) => (
                                  <div key={workflow.key} className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
                                      <Workflow className="h-3 w-3 shrink-0" />
                                      <span className="text-[11px] font-medium">{workflow.label}</span>
                                      <span className="text-[10px] text-muted-foreground/60">
                                        ({workflow.streams.length})
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {workflow.streams.map((stream) => (
                                        <LogStreamListItem
                                          key={stream.workflowId}
                                          stream={stream}
                                          onSelect={onSelectStream}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {streams.map((stream) => (
            <LogStreamListItem
              key={stream.workflowId}
              stream={stream}
              onSelect={onSelectStream}
            />
          ))}
        </div>
      )}

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
