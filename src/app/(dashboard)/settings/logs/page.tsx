'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { showErrorToast } from '@/lib/utils/error-handler';
import { Loader2, Filter, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { LogListItem } from './components/log-list-item';
import { LogFilterSlider } from './components/log-filter-slider';
import { useLogs } from './hooks/use-logs';
import { LogLevel, LogFilters, SelectedActivation, ActivationWithAgent } from './types';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [allActivations, setAllActivations] = useState<ActivationWithAgent[]>([]);
  const [isLoadingActivations, setIsLoadingActivations] = useState(true);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);
  const activationsAbortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedActivationsRef = useRef(false);

  // Initialize filters from URL params
  useEffect(() => {
    const agentParam = searchParams.get('agent');
    const activationParam = searchParams.get('activation');
    const logLevelParam = searchParams.get('logLevel');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const pageParam = searchParams.get('page');
    
    console.log('[LogsPage] Parsing URL params:', { 
      agentParam, 
      activationParam, 
      logLevelParam,
      startDateParam,
      endDateParam,
      pageParam 
    });
    
    if (agentParam && activationParam) {
      setSelectedActivation({ agentName: agentParam, activationName: activationParam });
    } else {
      setSelectedActivation(null);
    }

    if (logLevelParam) {
      const levels = logLevelParam.split(',').filter(l => 
        ['Error', 'Warning', 'Information', 'Debug', 'Trace'].includes(l)
      ) as LogLevel[];
      setSelectedLogLevels(levels);
    } else {
      setSelectedLogLevels([]);
    }

    if (startDateParam) {
      setStartDate(startDateParam);
    } else {
      setStartDate(null);
    }

    if (endDateParam) {
      setEndDate(endDateParam);
    } else {
      setEndDate(null);
    }
    
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page > 0) {
        setCurrentPage(page);
      }
    } else {
      setCurrentPage(1);
    }
    
    setUrlParamsInitialized(true);
  }, [searchParams]);

  // Fetch all activations
  useEffect(() => {
    const fetchActivations = async () => {
      if (!currentTenantId) {
        setAllActivations([]);
        setIsLoadingActivations(false);
        return;
      }

      // Skip if already fetched (for React Strict Mode)
      if (hasFetchedActivationsRef.current) {
        console.log('[LogsPage] Skipping activations fetch - already fetched');
        return;
      }

      // Cancel any pending request
      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      activationsAbortControllerRef.current = new AbortController();

      setIsLoadingActivations(true);
      try {
        const response = await fetch(
          `/api/tenants/${currentTenantId}/activations`,
          {
            signal: activationsAbortControllerRef.current.signal,
          }
        );

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
        console.log('[LogsPage] Fetched activations:', data);

        const activationsArray = Array.isArray(data) ? data : (data.activations || []);
        const activationsWithAgents = activationsArray.map((activation: any) => ({
          activationName: activation.name,
          agentName: activation.agentName,
          isActive: activation.isActive || false,
        }));

        console.log('[LogsPage] Mapped activations:', activationsWithAgents);
        setAllActivations(activationsWithAgents);
        hasFetchedActivationsRef.current = true;
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[LogsPage] Activations request aborted');
          return;
        }
        
        console.error('[LogsPage] Error fetching activations:', error);
        setAllActivations([]);
      } finally {
        setIsLoadingActivations(false);
      }
    };

    fetchActivations();

    // Cleanup function to abort request if component unmounts or tenantId changes
    return () => {
      if (activationsAbortControllerRef.current) {
        activationsAbortControllerRef.current.abort();
      }
    };
  }, [currentTenantId]);

  // Build filters for the hook
  const filters: LogFilters = {
    agentName: selectedActivation?.agentName,
    activationName: selectedActivation?.activationName,
    logLevel: selectedLogLevels.length > 0 ? selectedLogLevels : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page: currentPage,
    pageSize: 20,
  };

  // Only fetch logs when we have a tenant, user is authenticated, and URL params are initialized
  const shouldFetchLogs = Boolean(currentTenantId) && Boolean(user) && urlParamsInitialized;

  // Fetch logs
  const { 
    logs, 
    totalCount, 
    page, 
    pageSize, 
    totalPages, 
    isLoading, 
    error 
  } = useLogs(currentTenantId, filters, shouldFetchLogs);

  // Update URL when filters change
  const updateFiltersInURL = useCallback((
    newActivation: SelectedActivation | null,
    newLogLevels: LogLevel[],
    newStartDate: string | null,
    newEndDate: string | null,
    newPage: number = 1
  ) => {
    const params = new URLSearchParams();
    
    if (newActivation) {
      params.set('agent', newActivation.agentName);
      params.set('activation', newActivation.activationName);
    }
    
    if (newLogLevels.length > 0) {
      params.set('logLevel', newLogLevels.join(','));
    }

    if (newStartDate) {
      params.set('startDate', newStartDate);
    }

    if (newEndDate) {
      params.set('endDate', newEndDate);
    }
    
    if (newPage > 1) {
      params.set('page', newPage.toString());
    }
    
    const newURL = params.toString() ? `/settings/logs?${params.toString()}` : '/settings/logs';
    router.push(newURL, { scroll: false });
    
    setSelectedActivation(newActivation);
    setSelectedLogLevels(newLogLevels);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setCurrentPage(newPage);
  }, [router]);

  const handlePageChange = (newPage: number) => {
    updateFiltersInURL(selectedActivation, selectedLogLevels, startDate, endDate, newPage);
  };

  const clearFilter = (type: 'activation' | 'logLevel' | 'dateRange') => {
    if (type === 'activation') {
      updateFiltersInURL(null, selectedLogLevels, startDate, endDate, 1);
    } else if (type === 'logLevel') {
      updateFiltersInURL(selectedActivation, [], startDate, endDate, 1);
    } else if (type === 'dateRange') {
      updateFiltersInURL(selectedActivation, selectedLogLevels, null, null, 1);
    }
  };

  const clearAllFilters = () => {
    updateFiltersInURL(null, [], null, null, 1);
  };

  const hasActiveFilters = 
    selectedActivation !== null || 
    selectedLogLevels.length > 0 ||
    startDate !== null ||
    endDate !== null;
  
  const activeFilterCount = 
    (selectedActivation ? 1 : 0) + 
    (selectedLogLevels.length > 0 ? 1 : 0) +
    ((startDate || endDate) ? 1 : 0);

  return (
    <>
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="shrink-0">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Agent Logs
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Browse and filter execution logs from your agents
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
                  <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-xs rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

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

        {/* Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="border-border/50">
              <CardContent className="!px-0 !py-0">
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading logs...</p>
                </div>
              </CardContent>
            </Card>
          ) : logs.length > 0 ? (
            <>
              <div className="space-y-2">
                {logs.map((log) => (
                  <LogListItem key={log.id} log={log} />
                ))}
              </div>
              
              {/* Pagination */}
              <Card className="border-border/50">
                <CardContent className="!px-5 !py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground font-medium">
                      Page {currentPage} of {totalPages} • {totalCount} total log{totalCount !== 1 ? 's' : ''}
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
                    <FileText className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      No logs found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {hasActiveFilters 
                        ? 'Try adjusting your filters to see more logs' 
                        : 'Logs will appear here when agents execute workflows'}
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
            updateFiltersInURL(activation, logLevels, start, end, 1);
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
