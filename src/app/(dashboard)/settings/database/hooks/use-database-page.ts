'use client';

import { useState, useCallback } from 'react';
import { useDataSchema } from './use-data-schema';
import { useDataRecords } from './use-data-records';
import { DATE_RANGES, type DateRange, type DataSchemaResponse, type DataResponse } from '../types';
import { formatDateFromInput } from '../utils';
import { showToast } from '@/lib/toast';

const PAGE_SIZE = 50;

export interface UseDatabasePageParams {
  currentTenantId: string | null;
  tenantLoading: boolean;
  agentName: string | null;
  activationName: string | null;
}

export interface UseDatabasePageReturn {
  // Data
  schemaData: DataSchemaResponse | null;
  schemaLoading: boolean;
  schemaError: string | null;
  recordsData: DataResponse | null;
  recordsLoading: boolean;
  recordsError: string | null;

  // Filter state
  selectedDateRange: DateRange;
  customStartDate: string;
  customEndDate: string;
  selectedDataType: string | null;

  // UI state
  expandedRecords: Set<string>;
  currentPage: number;
  pageSize: number;
  hoveredDataType: string | null;
  deletingDataType: string | null;
  hoveredRecord: string | null;
  deletingRecord: string | null;

  // Handlers
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
}

export function useDatabasePage({
  currentTenantId,
  tenantLoading,
  agentName,
  activationName,
}: UseDatabasePageParams): UseDatabasePageReturn {
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

  const schemaEnabled = !!(currentTenantId && agentName && activationName && !tenantLoading);
  const recordsEnabled = !!(selectedDataType && currentTenantId && agentName && activationName && !tenantLoading);

  const { data: schemaData, isLoading: schemaLoading, error: schemaError } = useDataSchema(
    currentTenantId,
    agentName,
    activationName,
    customStartDate,
    customEndDate,
    schemaEnabled
  );

  const { data: recordsData, isLoading: recordsLoading, error: recordsError } = useDataRecords(
    currentTenantId,
    agentName,
    activationName,
    selectedDataType,
    customStartDate,
    customEndDate,
    currentPage * PAGE_SIZE,
    PAGE_SIZE,
    recordsEnabled
  );

  const triggerRefetch = useCallback(() => {
    const currentStart = customStartDate;
    setCustomStartDate(new Date(new Date(currentStart).getTime() + 1).toISOString());
    setTimeout(() => setCustomStartDate(currentStart), 100);
  }, [customStartDate]);

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
        });

        const response = await fetch(
          `/api/tenants/${currentTenantId}/data?${searchParams.toString()}`,
          { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete data (${response.status})`);
        }

        if (selectedDataType === dataType) {
          setSelectedDataType(null);
        }
        triggerRefetch();
        showToast.success({
          title: 'Data type deleted',
          description: `All data for "${dataType}" has been successfully deleted.`,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred while deleting the data type.';
        showToast.error({
          title: 'Failed to delete data',
          description: message,
        });
      } finally {
        setDeletingDataType(null);
      }
    },
    [currentTenantId, agentName, activationName, customStartDate, customEndDate, selectedDataType, triggerRefetch]
  );

  const handleDeleteRecord = useCallback(
    async (recordId: string) => {
      if (!currentTenantId) return;

      setDeletingRecord(recordId);
      try {
        const response = await fetch(`/api/tenants/${currentTenantId}/data/${recordId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete record (${response.status})`);
        }

        setCurrentPage(0);
        triggerRefetch();
        showToast.success({
          title: 'Record deleted',
          description: 'The data record has been successfully deleted.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred while deleting the record.';
        showToast.error({
          title: 'Failed to delete record',
          description: message,
        });
      } finally {
        setDeletingRecord(null);
      }
    },
    [currentTenantId, triggerRefetch]
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
  };
}
