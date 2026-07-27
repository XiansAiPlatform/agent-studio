import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LogFilters,
  LogLevel,
  LogStream,
  LogStreamFilters,
  SelectedActivation,
} from '../types';

const PAGE_SIZE = 20;
const VALID_LOG_LEVELS: LogLevel[] = ['Error', 'Warning', 'Information', 'Debug', 'Trace'];

/**
 * Owns all URL-derived state for the logs page (selected activation, log
 * level filters, date range, pagination, and the drilled-in workflow id),
 * plus the filter objects and mutation handlers views/consumers need.
 *
 * The URL is the single source of truth: reading a param populates state on
 * mount/navigation, and every mutation goes back through `updateURL` so the
 * page stays shareable/bookmarkable.
 */
export function useLogsUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedActivation, setSelectedActivation] = useState<SelectedActivation | null>(null);
  const [selectedLogLevels, setSelectedLogLevels] = useState<LogLevel[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedStreamMeta, setSelectedStreamMeta] = useState<LogStream | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [urlParamsInitialized, setUrlParamsInitialized] = useState(false);

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
        ? (logLevelParam.split(',').filter((l) => VALID_LOG_LEVELS.includes(l as LogLevel)) as LogLevel[])
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

  // Filters consumed by the streams view
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

  // Filters consumed by the drilled-in stream-logs view
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
      const newWorkflowId = next.workflowId !== undefined ? next.workflowId : selectedWorkflowId;

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

      const newURL = params.toString() ? `/settings/logs?${params.toString()}` : '/settings/logs';
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

  const handlePageChange = useCallback(
    (newPage: number) => updateURL({ page: newPage }),
    [updateURL]
  );

  const handleSelectStream = useCallback(
    (stream: LogStream) => {
      setSelectedStreamMeta(stream);
      updateURL({ workflowId: stream.workflowId, page: 1 });
    },
    [updateURL]
  );

  const handleBackToStreams = useCallback(() => {
    setSelectedStreamMeta(null);
    updateURL({ workflowId: null, page: 1 });
  }, [updateURL]);

  const clearFilter = useCallback(
    (type: 'activation' | 'logLevel' | 'dateRange') => {
      if (type === 'activation') updateURL({ activation: null, page: 1 });
      else if (type === 'logLevel') updateURL({ logLevels: [], page: 1 });
      else if (type === 'dateRange') updateURL({ startDate: null, endDate: null, page: 1 });
    },
    [updateURL]
  );

  const clearAllFilters = useCallback(() => {
    updateURL({ activation: null, logLevels: [], startDate: null, endDate: null, page: 1 });
  }, [updateURL]);

  const applyFilterSliderChanges = useCallback(
    (
      activation: SelectedActivation | null,
      logLevels: LogLevel[],
      start: string | null,
      end: string | null
    ) => {
      updateURL({ activation, logLevels, startDate: start, endDate: end, page: 1 });
    },
    [updateURL]
  );

  const hasActiveFilters =
    selectedActivation !== null || selectedLogLevels.length > 0 || startDate !== null || endDate !== null;

  const activeFilterCount =
    (selectedActivation ? 1 : 0) +
    (selectedLogLevels.length > 0 ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  return {
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
  };
}
