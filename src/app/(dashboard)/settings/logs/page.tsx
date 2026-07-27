'use client';

import { Suspense, useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { LogFilterSlider } from './components/log-filter-slider';
import { StreamsView } from './components/streams-view';
import { StreamLogsView } from './components/stream-logs-view';
import { LogsPageHeader } from './components/logs-page-header';
import { StreamsTitle } from './components/streams-title';
import { StreamDetailsTitle } from './components/stream-details-title';
import { ActiveFiltersBar } from './components/active-filters-bar';
import { useAutoRefresh } from './hooks/use-auto-refresh';
import { useActivationsList } from './hooks/use-activations-list';
import { useLogsUrlState } from './hooks/use-logs-url-state';

function LogsContent() {
  const { currentTenantId } = useTenant();
  const { user } = useAuth();

  const [isFilterSliderOpen, setIsFilterSliderOpen] = useState(false);

  const {
    urlParamsInitialized,
    isStreamView,
    currentPage,
    selectedActivation,
    selectedLogLevels,
    startDate,
    endDate,
    selectedWorkflowId,
    selectedStreamMeta,
    streamFilters,
    logFilters,
    hasActiveFilters,
    activeFilterCount,
    handlePageChange,
    handleSelectStream,
    handleBackToStreams,
    clearFilter,
    clearAllFilters,
    applyFilterSliderChanges,
  } = useLogsUrlState();

  const shouldFetch = Boolean(currentTenantId) && Boolean(user) && urlParamsInitialized;

  const { autoRefresh, toggleAutoRefresh, refreshTick, isRefreshing, intervalSeconds, maxDurationMinutes } =
    useAutoRefresh(shouldFetch);

  const { activations: allActivations } = useActivationsList(currentTenantId);

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        {/* Page Header */}
        <div className="space-y-5">
          <LogsPageHeader
            titleArea={
              isStreamView ? (
                <StreamsTitle />
              ) : (
                <StreamDetailsTitle
                  selectedStreamMeta={selectedStreamMeta}
                  selectedWorkflowId={selectedWorkflowId}
                  onBack={handleBackToStreams}
                />
              )
            }
            autoRefresh={autoRefresh}
            isRefreshing={isRefreshing}
            refreshTick={refreshTick}
            intervalSeconds={intervalSeconds}
            maxDurationMinutes={maxDurationMinutes}
            onToggleAutoRefresh={toggleAutoRefresh}
            activeFilterCount={activeFilterCount}
            onOpenFilter={() => setIsFilterSliderOpen(true)}
          />

          {hasActiveFilters && (
            <ActiveFiltersBar
              selectedActivation={selectedActivation}
              selectedLogLevels={selectedLogLevels}
              startDate={startDate}
              endDate={endDate}
              onClearFilter={clearFilter}
              onClearAll={clearAllFilters}
            />
          )}
        </div>

        {/* View */}
        <div className="space-y-3">
          {isStreamView ? (
            <StreamsView
              filters={streamFilters}
              currentPage={currentPage}
              enabled={shouldFetch}
              hasActiveFilters={hasActiveFilters}
              refreshTick={refreshTick}
              onPageChange={handlePageChange}
              onSelectStream={handleSelectStream}
            />
          ) : (
            <StreamLogsView
              filters={logFilters}
              currentPage={currentPage}
              enabled={shouldFetch}
              hasActiveFilters={hasActiveFilters}
              refreshTick={refreshTick}
              onPageChange={handlePageChange}
            />
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
          onFiltersChange={applyFilterSliderChanges}
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
