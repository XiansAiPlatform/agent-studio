'use client';

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import {
  Loader2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { LogListItem } from './components/log-list-item';
import { LogStreamListItem } from './components/log-stream-list-item';
import { LogFilterSlider } from './components/log-filter-slider';
import { useLogs } from './hooks/use-logs';
import { useLogStreams } from './hooks/use-log-streams';
import {
  LogLevel,
  LogFilters,
  LogStream,
  LogStreamFilters,
  SelectedActivation,
  ActivationWithAgent,
} from './types';

const PAGE_SIZE = 20;

function LogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  const [isFilterSliderOpen, setIsFilterSliderOpen] = useState(false);
  const [selectedActivation, setSelectedActivation] = useState<SelectedActivation | null>(null);
  const [selectedLogLevels, setSelectedLogLevels] = useState<LogLevel[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStreamMeta, setSelectedStreamMeta] = useState<LogStream | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allActivations, setAllActivations] = useState<ActivationWithAgent[]>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState(true);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);
  const activationsAbortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedActivationsRef = useRef(false);

  const isStreamView = !selectedWorkflowId;

  // Initialize filters from URL params
  useEffect(() => {
    const agentParam = searchParams.get('agent');
    const activationParam = searchParams.get('activation');
    const logLevelParam = searchParams.get('logLevel');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const pageParam = searchParams.get('page');
    const workflowIdParam = searchParams.get('workflowId');

    if (agentParam && activationParam) {
      setSelectedActivation({ agentName: agentParam, activationName: activationParam });
    } else {
      setSelectedActivation(null);
    }

    setSelectedLogLevels(
      logLevelParam
        ? (logLevelParam
            .split(',')
            .filter((l) => ['Error', 'Warning', 'Information', 'Debug', 'Trace'].includes(l)) as LogLevel[])
        : []
    );

    setStartDate(startDateParam || null);
    setEndDate(endDateParam || null);
    setSelectedWorkflowId(workflowIdParam || null);

    // If the user lands directly on a workflow URL (no in-memory metadata), clear stale meta.
    if (!workflowIdParam) {
      setSelectedStreamMeta(null);
    }

    if (pageParam) {
      const page = parseInt(pageParam, 10);
      setCurrentPage(!isNaN(page) && page > 0 ? page : 1);
    } else {
      setCurrentPage(1);
    }

    setUrlParamsInitialized(true);
  }, [searchParams]);

  // Fetch all activations (used by the filter slider)
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        setAllActivations([]);
        setIsLoadingActivations(false);
        return;
      }

      if (hasFetchedActivationsRef.current) return;

      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }
      activationsAbortControllerRef.current = new AbortController();

      setIsLoadingActivations(true);
      try {
        const response = await fetch(`/api/agent-activations`, {
          signal: activationsAbortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = 'Failed to fetch activations';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = `Failed to fetch activations: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const activationsArray = Array.isArray(data) ? data : data.activations || [];
        const activationsWithAgents = activationsArray.map((activation: any) => ({
          activationName: activation.name,
          agentName: activation.agentName,
          isActive: activation.isActive || false,
        }));

        setAllActivations(activationsWithAgents);
        hasFetchedActivationsRef.current = true;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('[LogsPage] Error fetching activations:', error);
        setAllActivations([]);
      } finally {
        setIsLoadingActivations(false);
      }
    };

    fetchActivations();

    return () => {
      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }
    };
  }, [currentTenantId]);

  const shouldFetch = Boolean(currentTenantId) && Boolean(user) && urlParamsInitialized;

  // Streams query - drives the streams list
  const streamFilters: LogStreamFilters = useMemo(
    () => ({
      agentName: selectedActivation?.agentName,
      activationName: selectedActivation?.activationName,
      logLevel: selectedLogLevels.length > 0 ? selectedLogLevels : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [selectedActivation, selectedLogLevels, startDate, endDate, currentPage]
  );

  const {
    streams,
    totalCount: streamsTotalCount,
    totalPages: streamsTotalPages,
    isLoading: isLoadingStreams,
  } = useLogStreams(streamFilters, shouldFetch && isStreamView);

  // Logs query - active only when a stream is selected (drilled-in view)
  const logFilters: LogFilters = useMemo(
    () => ({
      agentName: selectedActivation?.agentName,
      activationName: selectedActivation?.activationName,
      workflowId: selectedWorkflowId || undefined,
      logLevel: selectedLogLevels.length > 0 ? selectedLogLevels : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [selectedActivation, selectedWorkflowId, selectedLogLevels, startDate, endDate, currentPage]
  );

  const {
    logs,
    totalCount: logsTotalCount,
    totalPages: logsTotalPages,
    isLoading: isLoadingLogs,
  } = useLogs(currentTenantId, logFilters, shouldFetch && !isStreamView);

  // URL writer
  const updateURL = useCallback(
    (next: {
      activation?: SelectedActivation | null;
      logLevels?: LogLevel[];
      startDate?: string | null;
      endDate?: string | null;
      page?: number;
      workflowId?: string | null;
    }) => {
      const newActivation = next.activation !== undefined ? next.activation : selectedActivation;
      const newLogLevels = next.logLevels !== undefined ? next.logLevels : selectedLogLevels;
      const newStartDate = next.startDate !== undefined ? next.startDate : startDate;
      const newEndDate = next.endDate !== undefined ? next.endDate : endDate;
      const newPage = next.page !== undefined ? next.page : currentPage;
      const newWorkflowId =
        next.workflowId !== undefined ? next.workflowId : selectedWorkflowId;

      const params = new URLSearchParams();
      if (newWorkflowId) params.set('workflowId', newWorkflowId);
      if (newActivation) {
        params.set('agent', newActivation.agentName);
        params.set('activation', newActivation.activationName);
      }
      if (newLogLevels.length > 0) params.set('logLevel', newLogLevels.join(','));
      if (newStartDate) params.set('startDate', newStartDate);
      if (newEndDate) params.set('endDate', newEndDate);
      if (newPage > 1) params.set('page', newPage.toString());

      const newURL = params.toString()
        ? `/settings/logs?${params.toString()}`
        : '/settings/logs';
      router.push(newURL, { scroll: false });

      setSelectedActivation(newActivation);
      setSelectedLogLevels(newLogLevels);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      setCurrentPage(newPage);
      setSelectedWorkflowId(newWorkflowId);
    },
    [router, selectedActivation, selectedLogLevels, startDate, endDate, currentPage, selectedWorkflowId]
  );

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage });
  };

  const handleSelectStream = (stream: LogStream) => {
    setSelectedStreamMeta(stream);
    updateURL({ workflowId: stream.workflowId, page: 1 });
  };

  const handleBackToStreams = () => {
    setSelectedStreamMeta(null);
    updateURL({ workflowId: null, page: 1 });
  };

  const clearFilter = (type: 'activation' | 'logLevel' | 'dateRange') => {
    if (type === 'activation') updateURL({ activation: null, page: 1 });
    else if (type === 'logLevel') updateURL({ logLevels: [], page: 1 });
    else if (type === 'dateRange') updateURL({ startDate: null, endDate: null, page: 1 });
  };

  const clearAllFilters = () => {
    updateURL({ activation: null, logLevels: [], startDate: null, endDate: null, page: 1 });
  };

  const hasActiveFilters =
    selectedActivation !== null ||
    selectedLogLevels.length > 0 ||
    startDate !== null ||
    endDate !== null;

  const activeFilterCount =
    (selectedActivation ? 1 : 0) +
    (selectedLogLevels.length > 0 ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const isLoading = isStreamView ? isLoadingStreams : isLoadingLogs;
  const totalPages = isStreamView ? streamsTotalPages : logsTotalPages;
  const totalCount = isStreamView ? streamsTotalCount : logsTotalCount;
  const itemNoun = isStreamView ? 'stream' : 'log';

  return (
    <>
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Log Streams
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {isStreamView
                  ? 'Browse log streams (workflows) and drill into a stream to view its logs'
                  : 'Logs for the selected workflow stream'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsFilterSliderOpen(true)}
                className="shrink-0 rounded-xl"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 h-5 min-w-5 px-1.5 text-xs rounded-full"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Drill-in header (logs view) */}
          {!isStreamView && (
            <Card className="border-border/50 bg-muted/20">
              <CardContent className="!px-4 !py-3">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToStreams}
                    className="h-8 rounded-lg shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Streams
                  </Button>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {selectedStreamMeta?.agent ?? 'Workflow stream'}
                        {selectedStreamMeta?.activation && (
                          <>
                            <span className="text-muted-foreground/50 mx-1.5">•</span>
                            <span className="text-muted-foreground/80 font-normal">
                              {selectedStreamMeta.activation}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate">
                      {selectedWorkflowId}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground font-medium">Active filters:</span>

              {selectedActivation && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
                  onClick={() => clearFilter('activation')}
                >
                  {selectedActivation.activationName}
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              )}

              {selectedLogLevels.length > 0 && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
                  onClick={() => clearFilter('logLevel')}
                >
                  {selectedLogLevels.length} level{selectedLogLevels.length > 1 ? 's' : ''}
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              )}

              {(startDate || endDate) && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 transition-colors rounded-lg pl-2.5 pr-1.5 py-1"
                  onClick={() => clearFilter('dateRange')}
                >
                  Date range
                  <X className="ml-1.5 h-3 w-3" />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-2 text-xs hover:bg-muted/60"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="border-border/50">
              <CardContent className="!px-0 !py-0">
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isStreamView ? 'Loading log streams...' : 'Loading logs...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (isStreamView ? streams.length > 0 : logs.length > 0) ? (
            <>
              <div className="space-y-2">
                {isStreamView
                  ? streams.map((stream) => (
                      <LogStreamListItem
                        key={stream.workflowId}
                        stream={stream}
                        onSelect={handleSelectStream}
                      />
                    ))
                  : logs.map((log) => <LogListItem key={log.id} log={log} />)}
              </div>

              {/* Pagination */}
              <Card className="border-border/50">
                <CardContent className="!px-5 !py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">
                      Page {currentPage} of {Math.max(totalPages, 1)} • {totalCount.toLocaleString()} total{' '}
                      {itemNoun}
                      {totalCount !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                        className="h-8 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || isLoading}
                        className="h-8 rounded-lg"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-border/50">
              <CardContent className="!px-0 !py-0">
                <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
                  <div className="rounded-full bg-muted/50 p-4">
                    {isStreamView ? (
                      <Layers className="h-7 w-7 text-muted-foreground/60" />
                    ) : (
                      <FileText className="h-7 w-7 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isStreamView ? 'No log streams found' : 'No logs found'}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {hasActiveFilters
                        ? 'Try adjusting your filters to see more results'
                        : isStreamView
                        ? 'Streams will appear here when agents start executing workflows'
                        : 'Logs will appear here when agents emit log entries for this stream'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Filter Slider */}
      {isFilterSliderOpen && (
        <LogFilterSlider
          isOpen={isFilterSliderOpen}
          onClose={() => setIsFilterSliderOpen(false)}
          activations={allActivations}
          selectedActivation={selectedActivation}
          selectedLogLevels={selectedLogLevels}
          startDate={startDate}
          endDate={endDate}
          onFiltersChange={(activation, logLevels, start, end) => {
            updateURL({
              activation,
              logLevels,
              startDate: start,
              endDate: end,
              page: 1,
            });
          }}
        />
      )}
    </>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <LogsContent />
    </Suspense>
  );
}
