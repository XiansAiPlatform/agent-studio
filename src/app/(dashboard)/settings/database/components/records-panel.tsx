'use client';

import { Button } from '@/components/ui/button';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  AlertCircle,
} from 'lucide-react';
import { type DataResponse } from '../types';
import { RecordCard } from './record-card';

interface RecordsPanelProps {
  selectedDataType: string | null;
  recordsData: DataResponse | null;
  recordsLoading: boolean;
  recordsError: string | null;
  currentPage: number;
  pageSize: number;
  expandedRecords: Set<string>;
  hoveredRecord: string | null;
  deletingRecord: string | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onToggleRecord: (recordId: string) => void;
  onHoverRecord: (recordId: string | null) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

export function RecordsPanel({
  selectedDataType,
  recordsData,
  recordsLoading,
  recordsError,
  currentPage,
  pageSize,
  expandedRecords,
  hoveredRecord,
  deletingRecord,
  onPreviousPage,
  onNextPage,
  onToggleRecord,
  onHoverRecord,
  onDeleteRecord,
}: RecordsPanelProps) {
  if (!selectedDataType) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select a Data Type</h3>
          <p className="text-muted-foreground">
            Choose a data type from the left panel to explore its records
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              {selectedDataType}
            </h2>
            {recordsData && (
              <p className="text-sm text-muted-foreground mt-1">
                Showing {currentPage * pageSize + 1}-
                {Math.min((currentPage + 1) * pageSize, recordsData.total)} of {recordsData.total}{' '}
                records
              </p>
            )}
          </div>

          {recordsData && recordsData.total > pageSize && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviousPage}
                disabled={currentPage === 0 || recordsLoading}
                className="h-8 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!recordsData || recordsData.data.length < pageSize || recordsLoading}
                className="h-8 px-3"
              >
                {recordsLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {recordsLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading records...</p>
          </div>
        )}

        {recordsError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive mb-2">Error Loading Records</p>
            <p className="text-sm text-muted-foreground">{recordsError}</p>
          </div>
        )}

        {recordsData && (
          <div className="p-6">
            {recordsData.data.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No records found for the selected criteria</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recordsData.data.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    isExpanded={expandedRecords.has(record.id)}
                    isHovered={hoveredRecord === record.id}
                    isDeleting={deletingRecord === record.id}
                    onToggle={() => onToggleRecord(record.id)}
                    onHoverChange={(hovered) => onHoverRecord(hovered ? record.id : null)}
                    onDelete={() => onDeleteRecord(record.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
