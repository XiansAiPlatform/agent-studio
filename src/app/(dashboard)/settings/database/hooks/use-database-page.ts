'use client';

import { useState, useCallback } from 'react';
import { useDataSchema } from './use-data-schema';
import { useDataRecords } from './use-data-records';
import {
  DATE_RANGES,
  type DateRange,
  type DataSchemaResponse,
  type DataResponse,
  type CreateDataRecordInput,
  type UpdateDataRecordInput,
} from '../types';
import { formatDateFromInput } from '../utils';
import { showToast } from '@/lib/toast';
import { useTenant } from '@/hooks/use-tenant';

const PAGE_SIZE = 50;

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const errorData = await response.json().catch(() => ({} as { error?: string }));
  return errorData.error || `${fallback} (${response.status})`;
}

export interface UseDatabasePageParams {
  agentName: string | null;
  activationName: string | null;
}

export interface UseDatabasePageReturn {
  schemaData: DataSchemaResponse | null;
  schemaLoading: boolean;
  schemaError: string | null;
  recordsData: DataResponse | null;
  recordsLoading: boolean;
  recordsError: string | null;

  selectedDateRange: DateRange;
  customStartDate: string;
  customEndDate: string;
  selectedDataType: string | null;

  expandedRecords: Set<string>;
  currentPage: number;
  pageSize: number;
  hoveredDataType: string | null;
  deletingDataType: string | null;
  hoveredRecord: string | null;
  deletingRecord: string | null;
  isSavingRecord: boolean;

  setHoveredDataType: (type: string | null) => void;
  setHoveredRecord: (id: string | null) => void;
  handleDateRangeChange: (value: string) => void;
  handleCustomDateChange: (startDate: string, endDate: string) => void;
  handleDataTypeSelect: (type: string) => void;
  toggleRecordExpansion: (recordId: string) => void;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  handleDeleteDataType: (dataType: string) => Promise<void>;
  handleDeleteRecord: (recordId: string) => Promise<void>;
  handleCreateRecord: (input: CreateDataRecordInput) => Promise<void>;
  handleUpdateRecord: (recordId: string, input: UpdateDataRecordInput) => Promise<void>;
}

export function useDatabasePage({
  agentName,
  activationName,
}: UseDatabasePageParams): UseDatabasePageReturn {
  const { currentTenantId, isLoading: tenantLoading } = useTenant();
  const [selectedDateRange, setSelectedDateRange] = useState(DATE_RANGES[4]);
  const [customStartDate, setCustomStartDate] = useState(DATE_RANGES[4].startDate);
  const [customEndDate, setCustomEndDate] = useState(DATE_RANGES[4].endDate);
  const [selectedDataType, setSelectedDataType] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredDataType, setHoveredDataType] = useState<string | null>(null);
  const [deletingDataType, setDeletingDataType] = useState<string | null>(null);
  const [hoveredRecord, setHoveredRecord] = useState<string | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<string | null>(null);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const schemaEnabled = !!(currentTenantId && agentName && activationName && !tenantLoading);
  const recordsEnabled = !!(
    selectedDataType &&
    currentTenantId &&
    agentName &&
    activationName &&
    !tenantLoading
  );

  const { data: schemaData, isLoading: schemaLoading, error: schemaError } = useDataSchema(
    agentName,
    activationName,
    customStartDate,
    customEndDate,
    schemaEnabled,
    refreshNonce
  );

  const {
    data: recordsData,
    isLoading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useDataRecords(
    agentName,
    activationName,
    selectedDataType,
    customStartDate,
    customEndDate,
    currentPage * PAGE_SIZE,
    PAGE_SIZE,
    recordsEnabled,
    refreshNonce
  );

  const refetchAll = useCallback(() => {
    const now = new Date().toISOString();
    if (new Date(customEndDate).getTime() < Date.now()) {
      setCustomEndDate(now);
    }
    setRefreshNonce((n) => n + 1);
  }, [customEndDate]);

  const handleDateRangeChange = useCallback((value: string) => {
    const range = DATE_RANGES.find((r) => r.value === value);
    if (range) {
      setSelectedDateRange(range);
      setCustomStartDate(range.startDate);
      setCustomEndDate(range.endDate);
      setSelectedDataType(null);
    }
  }, []);

  const handleCustomDateChange = useCallback((startDate: string, endDate: string) => {
    setCustomStartDate(formatDateFromInput(startDate));
    setCustomEndDate(formatDateFromInput(endDate));
    setSelectedDataType(null);
    setCurrentPage(0);
  }, []);

  const handleDataTypeSelect = useCallback((type: string) => {
    setSelectedDataType((prev) => (type === prev ? null : type));
    setCurrentPage(0);
    setExpandedRecords(new Set());
  }, []);

  const toggleRecordExpansion = useCallback((recordId: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (recordsData && recordsData.data.length === PAGE_SIZE) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [recordsData]);

  const handleDeleteDataType = useCallback(
    async (dataType: string) => {
      if (!currentTenantId || !agentName || !activationName) return;

      setDeletingDataType(dataType);
      try {
        const searchParams = new URLSearchParams({
          startDate: customStartDate,
          endDate: customEndDate,
          agentName,
          dataType,
          activationName,
        });

        const response = await fetch(`/api/data?${searchParams.toString()}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to delete data'));
        }

        if (selectedDataType === dataType) {
          setSelectedDataType(null);
        }
        refetchAll();
        showToast.success({
          title: 'Data type deleted',
          description: `All data for "${dataType}" has been successfully deleted.`,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while deleting the data type.';
        showToast.error({
          title: 'Failed to delete data',
          description: message,
        });
      } finally {
        setDeletingDataType(null);
      }
    },
    [
      currentTenantId,
      agentName,
      activationName,
      customStartDate,
      customEndDate,
      selectedDataType,
      refetchAll,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (recordId: string) => {
      if (!currentTenantId) return;

      setDeletingRecord(recordId);
      try {
        const response = await fetch(`/api/data/${encodeURIComponent(recordId)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to delete record'));
        }

        setCurrentPage(0);
        refetchAll();
        showToast.success({
          title: 'Record deleted',
          description: 'The data record has been successfully deleted.',
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while deleting the record.';
        showToast.error({
          title: 'Failed to delete record',
          description: message,
        });
      } finally {
        setDeletingRecord(null);
      }
    },
    [currentTenantId, refetchAll]
  );

  const handleCreateRecord = useCallback(
    async (input: CreateDataRecordInput) => {
      if (!currentTenantId || !agentName || !activationName) return;

      setIsSavingRecord(true);
      try {
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName,
            activationName,
            dataType: input.dataType,
            key: input.key,
            content: input.content,
            participantId: input.participantId,
            metadata: input.metadata,
            expiresAt: input.expiresAt,
          }),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to create record'));
        }

        setSelectedDataType(input.dataType);
        setCurrentPage(0);
        setExpandedRecords(new Set());
        refetchAll();
        showToast.success({
          title: 'Record created',
          description: `Saved "${input.key}" in ${input.dataType}.`,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while creating the record.';
        showToast.error({
          title: 'Failed to create record',
          description: message,
        });
        throw error;
      } finally {
        setIsSavingRecord(false);
      }
    },
    [currentTenantId, agentName, activationName, refetchAll]
  );

  const handleUpdateRecord = useCallback(
    async (recordId: string, input: UpdateDataRecordInput) => {
      if (!currentTenantId) return;

      setIsSavingRecord(true);
      try {
        const response = await fetch(`/api/data/${encodeURIComponent(recordId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error(await readErrorMessage(response, 'Failed to update record'));
        }

        await refetchRecords();
        showToast.success({
          title: 'Record updated',
          description: 'The data record has been saved.',
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while updating the record.';
        showToast.error({
          title: 'Failed to update record',
          description: message,
        });
        throw error;
      } finally {
        setIsSavingRecord(false);
      }
    },
    [currentTenantId, refetchRecords]
  );

  return {
    schemaData,
    schemaLoading,
    schemaError,
    recordsData,
    recordsLoading,
    recordsError,
    selectedDateRange,
    customStartDate,
    customEndDate,
    selectedDataType,
    expandedRecords,
    currentPage,
    pageSize: PAGE_SIZE,
    hoveredDataType,
    deletingDataType,
    hoveredRecord,
    deletingRecord,
    isSavingRecord,
    setHoveredDataType,
    setHoveredRecord,
    handleDateRangeChange,
    handleCustomDateChange,
    handleDataTypeSelect,
    toggleRecordExpansion,
    handlePreviousPage,
    handleNextPage,
    handleDeleteDataType,
    handleDeleteRecord,
    handleCreateRecord,
    handleUpdateRecord,
  };
}
