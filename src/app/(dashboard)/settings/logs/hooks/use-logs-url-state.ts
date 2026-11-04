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
 * level filters, date range, search term, pagination, and the drilled-in workflow id),
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
  // Third filter level under the activation. Only meaningful with an activation selected.
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<string | null>(null);
  const [selectedLogLevels, setSelectedLogLevels] = useState<LogLevel[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  // "Include child workflows" filter (`children=1`): widens the workflow type filter and the
  // drilled-in stream to the child workflows they started. Also set by schedule run links.
  const [includeChildWorkflows, setIncludeChildWorkflows] = useState(false);
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
    const searchParam = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const workflowIdParam = searchParams.get('workflowId');
    const workflowTypeParam = searchParams.get('workflowType');
    const childrenParam = searchParams.get('children');

    if (agentParam && activationParam) {
      setSelectedActivation({ agentName: agentParam, activationName: activationParam });
      setSelectedWorkflowType(workflowTypeParam || null);
    } else {
      setSelectedActivation(null);
      setSelectedWorkflowType(null);
    }

    setSelectedLogLevels(
      logLevelParam
        ? (logLevelParam.split(',').filter((l) => VALID_LOG_LEVELS.includes(l as LogLevel)) as LogLevel[])
        : []
    );

    setStartDate(startDateParam || null);
    setEndDate(endDateParam || null);
    setSearch(searchParam || null);
    setSelectedWorkflowId(workflowIdParam || null);
    setIncludeChildWorkflows(childrenParam === '1');

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
      workflowType: selectedWorkflowType || undefined,
      logLevel: selectedLogLevels.length > 0 ? selectedLogLevels : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      includeChildWorkflows: includeChildWorkflows || undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [selectedActivation, selectedWorkflowType, selectedLogLevels, startDate, endDate, search, includeChildWorkflows, currentPage]
  );

  // Filters consumed by the drilled-in stream-logs view
  const logFilters: LogFilters = useMemo(
    () => ({
      agentName: selectedActivation?.agentName,
      activationName: selectedActivation?.activationName,
      workflowId: selectedWorkflowId || undefined,
      workflowType: selectedWorkflowType || undefined,
      logLevel: selectedLogLevels.length > 0 ? selectedLogLevels : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      includeChildWorkflows: includeChildWorkflows || undefined,
      page: currentPage,
      pageSize: PAGE_SIZE,
    }),
    [selectedActivation, selectedWorkflowId, selectedWorkflowType, selectedLogLevels, startDate, endDate, search, includeChildWorkflows, currentPage]
  );

  const updateURL = useCallback(
    (next: {
      activation?: SelectedActivation | null;
      workflowType?: string | null;
      logLevels?: LogLevel[];
      startDate?: string | null;
      endDate?: string | null;
      search?: string | null;
      page?: number;
      workflowId?: string | null;
      includeChildWorkflows?: boolean;
    }) => {
      const newActivation = next.activation !== undefined ? next.activation : selectedActivation;
      const activationChanged =
        newActivation?.agentName !== selectedActivation?.agentName ||
        newActivation?.activationName !== selectedActivation?.activationName;
      // A workflow type belongs to one agent/activation: drop it when the activation changes
      // unless the caller sets a new one explicitly.
      const newWorkflowType = !newActivation
        ? null
        : next.workflowType !== undefined
          ? next.workflowType
          : activationChanged
            ? null
            : selectedWorkflowType;
      const newLogLevels = next.logLevels !== undefined ? next.logLevels : selectedLogLevels;
      const newStartDate = next.startDate !== undefined ? next.startDate : startDate;
      const newEndDate = next.endDate !== undefined ? next.endDate : endDate;
      const newSearch = next.search !== undefined ? next.search : search;
      const newPage = next.page !== undefined ? next.page : currentPage;
      // Changing the activation or workflow scope leaves a drilled-in stream: the stream belongs to
      // the old scope, so staying on it would make the new filter look like it had no effect.
      const scopeChanged = activationChanged || newWorkflowType !== selectedWorkflowType;
      const newWorkflowId =
        next.workflowId !== undefined ? next.workflowId : scopeChanged ? null : selectedWorkflowId;
      const newIncludeChildWorkflows =
        next.includeChildWorkflows !== undefined ? next.includeChildWorkflows : includeChildWorkflows;

      const params = new URLSearchParams();
      if (newWorkflowId) params.set('workflowId', newWorkflowId);
      if (newIncludeChildWorkflows) params.set('children', '1');
      if (newActivation) {
        params.set('agent', newActivation.agentName);
        params.set('activation', newActivation.activationName);
      }
      if (newWorkflowType) params.set('workflowType', newWorkflowType);
      if (newLogLevels.length > 0) params.set('logLevel', newLogLevels.join(','));
      if (newStartDate) params.set('startDate', newStartDate);
      if (newEndDate) params.set('endDate', newEndDate);
      if (newSearch) params.set('search', newSearch);
      if (newPage > 1) params.set('page', newPage.toString());

      const newURL = params.toString() ? `/settings/logs?${params.toString()}` : '/settings/logs';
      router.push(newURL, { scroll: false });

      setSelectedActivation(newActivation);
      setSelectedWorkflowType(newWorkflowType);
      setSelectedLogLevels(newLogLevels);
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      setSearch(newSearch);
      setCurrentPage(newPage);
      setSelectedWorkflowId(newWorkflowId);
      setIncludeChildWorkflows(newIncludeChildWorkflows);
      if (!newWorkflowId) setSelectedStreamMeta(null);
    },
    [router, selectedActivation, selectedWorkflowType, selectedLogLevels, startDate, endDate, search, currentPage, selectedWorkflowId, includeChildWorkflows]
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
    (type: 'activation' | 'workflowType' | 'logLevel' | 'dateRange' | 'search' | 'children') => {
      if (type === 'activation') updateURL({ activation: null, page: 1 });
      else if (type === 'children') updateURL({ includeChildWorkflows: false, page: 1 });
      else if (type === 'workflowType') updateURL({ workflowType: null, page: 1 });
      else if (type === 'logLevel') updateURL({ logLevels: [], page: 1 });
      else if (type === 'dateRange') updateURL({ startDate: null, endDate: null, page: 1 });
      else if (type === 'search') updateURL({ search: null, page: 1 });
    },
    [updateURL]
  );

  const clearAllFilters = useCallback(() => {
    updateURL({
      activation: null,
      logLevels: [],
      startDate: null,
      endDate: null,
      search: null,
      includeChildWorkflows: false,
      page: 1,
    });
  }, [updateURL]);

  const applyFilterSliderChanges = useCallback(
    (
      activation: SelectedActivation | null,
      workflowType: string | null,
      logLevels: LogLevel[],
      start: string | null,
      end: string | null,
      searchTerm: string | null,
      includeChildren: boolean
    ) => {
      updateURL({
        activation,
        workflowType,
        logLevels,
        startDate: start,
        endDate: end,
        search: searchTerm,
        includeChildWorkflows: includeChildren,
        page: 1,
      });
    },
    [updateURL]
  );

  const hasActiveFilters =
    selectedActivation !== null ||
    selectedLogLevels.length > 0 ||
    startDate !== null ||
    endDate !== null ||
    search !== null ||
    includeChildWorkflows;

  const activeFilterCount =
    (selectedActivation ? 1 : 0) +
    (selectedWorkflowType ? 1 : 0) +
    (selectedLogLevels.length > 0 ? 1 : 0) +
    (startDate || endDate ? 1 : 0) +
    (search ? 1 : 0) +
    (includeChildWorkflows ? 1 : 0);

  return {
    urlParamsInitialized,
    isStreamView,
    currentPage,
    selectedActivation,
    selectedWorkflowType,
    selectedLogLevels,
    startDate,
    endDate,
    search,
    includeChildWorkflows,
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
