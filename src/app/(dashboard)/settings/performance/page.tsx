'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, BarChart3 } from 'lucide-react';
import { useMetricsCategories } from './hooks/use-metrics-categories';
import { useMetricsStats } from './hooks/use-metrics-stats';
import { useActivations } from './hooks/use-activations';
import { DateRangePicker } from './components/date-range-picker';
import { SummaryCards } from './components/summary-cards';
import { CategoryCard } from './components/category-card';
import { PerformanceFilters } from './components/performance-filters';
import { DateRangePreset } from './types';
import { getDateRangeFromPreset, getThisMonthRange } from './utils/date-helpers';

function PerformanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  // Get initial date range (default to this month)
  const initialRange = getThisMonthRange();
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedActivation, setSelectedActivation] = useState<string | null>(null);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);
  
  // Track if we're updating from user action to avoid URL sync loops
  const isUpdatingFromUser = useRef(false);

  // Initialize from URL params only once on mount
  useEffect(() => {
    if (urlParamsInitialized || isUpdatingFromUser.current) return;

    const agentParam = searchParams.get('agent');
    const activationParam = searchParams.get('activation');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    setSelectedAgent(agentParam || null);
    setSelectedActivation(activationParam || null);
    
    if (startDateParam && endDateParam) {
      setStartDate(startDateParam);
      setEndDate(endDateParam);
    }

    setUrlParamsInitialized(true);
  }, [searchParams, urlParamsInitialized]);

  // Update URL when filters change
  const updateURL = useCallback(
    (agent: string | null, activation: string | null, start: string, end: string) => {
      isUpdatingFromUser.current = true;
      
      const params = new URLSearchParams();

      if (agent) {
        params.set('agent', agent);
      }
      if (activation) {
        params.set('activation', activation);
      }
      params.set('startDate', start);
      params.set('endDate', end);

      const newURL = params.toString()
        ? `/settings/performance?${params.toString()}`
        : '/settings/performance';
      router.push(newURL, { scroll: false });
      
      // Reset the flag after a short delay to allow URL to settle
      setTimeout(() => {
        isUpdatingFromUser.current = false;
      }, 100);
    },
    [router]
  );

  const handleDateRangeChange = (preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    updateURL(selectedAgent, selectedActivation, range.startDate, range.endDate);
  };

  const handleAgentChange = (agent: string | null) => {
    setSelectedAgent(agent);
    // Reset activation when agent changes
    setSelectedActivation(null);
    updateURL(agent, null, startDate, endDate);
  };

  const handleActivationChange = (activation: string | null) => {
    setSelectedActivation(activation);
    updateURL(selectedAgent, activation, startDate, endDate);
  };

  const handleClearFilters = () => {
    setSelectedAgent(null);
    setSelectedActivation(null);
    updateURL(null, null, startDate, endDate);
  };

  const handleViewDetails = (type: string, category: string) => {
    // Navigate to timeline page
    const params = new URLSearchParams({
      category,
      type,
      startDate,
      endDate,
    });

    if (selectedAgent) {
      params.set('agent', selectedAgent);
    }
    if (selectedActivation) {
      params.set('activation', selectedActivation);
    }

    router.push(`/settings/performance/timeline?${params.toString()}`);
  };

  // Fetch data
  const shouldFetch = Boolean(currentTenantId) && Boolean(user) && urlParamsInitialized;
  const { data, isLoading, error } = useMetricsCategories(
    currentTenantId,
    startDate,
    endDate,
    selectedAgent,
    selectedActivation,
    shouldFetch
  );

  // Fetch activations for instance filtering
  const { 
    activations, 
    isLoading: isLoadingActivations 
  } = useActivations(currentTenantId, shouldFetch);

  // Fetch stats for displaying aggregate metrics
  // Only fetch stats when we have at least an agent or activation selected
  const shouldFetchStats = shouldFetch && (selectedAgent !== null || selectedActivation !== null);
  
  const { 
    data: statsData,
    isLoading: isLoadingStats 
  } = useMetricsStats(
    currentTenantId,
    selectedAgent,
    selectedActivation,
    startDate,
    endDate,
    shouldFetchStats
  );

  // Extract unique agent names from activations for the dropdown
  const availableAgents = Array.from(
    new Set(activations.map((activation) => activation.agentName))
  ).sort();

  // Categories are already filtered by the API based on selectedAgent and selectedActivation
  const filteredCategories = data?.categories || [];

  // Helper function to get stats for a specific metric type
  const getStatsForType = (category: string, type: string) => {
    if (!statsData?.categoriesAndTypes) return null;
    
    const categoryData = statsData.categoriesAndTypes.find(
      (c) => c.category === category
    );
    if (!categoryData) return null;
    
    const typeData = categoryData.types.find((t) => t.type === type);
    return typeData?.stats || null;
  };

  // Helper function to get activation names for a specific metric type
  const getActivationsForType = (category: string, type: string): string[] => {
    if (!statsData?.byActivation) return [];
    
    // Collect all activations that have this metric type
    const activationNames: string[] = [];
    
    statsData.byActivation.forEach((activation) => {
      const categoryData = activation.categoriesAndTypes.find(
        (c) => c.category === category
      );
      if (!categoryData) return;
      
      const hasType = categoryData.types.some((t) => t.type === type);
      if (hasType) {
        activationNames.push(activation.activationName);
      }
    });
    
    return activationNames;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                Performance
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor metrics and resource usage across your agents
            </p>
          </div>
          <div className="shrink-0">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-muted/10">
          <CardContent className="!p-5">
            <PerformanceFilters
              availableAgents={availableAgents}
              selectedAgent={selectedAgent}
              selectedActivation={selectedActivation}
              availableActivations={activations}
              isLoadingActivations={isLoadingActivations}
              onAgentChange={handleAgentChange}
              onActivationChange={handleActivationChange}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-border/50">
          <CardContent className="!px-0 !py-0">
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading performance metrics...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-border/50 border-destructive/50">
          <CardContent className="!px-0 !py-0">
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="rounded-full bg-destructive/10 p-4">
                <BarChart3 className="h-7 w-7 text-destructive" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Failed to load metrics</p>
                <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && !error && data && (
        <>
          {/* Summary Cards */}
          <SummaryCards
            totalRecords={data.summary.totalRecords}
            totalTypes={data.summary.totalTypes}
            totalCategories={data.summary.totalCategories}
          />

          {/* Categories */}
          <div className="space-y-4">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <CategoryCard
                  key={category.category}
                  category={category}
                  onViewDetails={handleViewDetails}
                  getStatsForType={getStatsForType}
                  getActivationsForType={getActivationsForType}
                  isLoadingStats={isLoadingStats}
                  showViewTimeline={selectedAgent !== null}
                />
              ))
            ) : (
              <Card className="border-border/50">
                <CardContent className="!px-0 !py-0">
                  <div className="flex flex-col items-center justify-center py-20 px-6 space-y-3">
                    <div className="rounded-full bg-muted/50 p-4">
                      <BarChart3 className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">No metrics found</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {selectedAgent
                          ? 'Try adjusting your filters or selecting a different agent'
                          : 'No performance data available for the selected date range'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PerformanceContent />
    </Suspense>
  );
}
