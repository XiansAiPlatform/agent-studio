'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertCircle, FileText, Layers, Trash2 } from 'lucide-react';

interface DataTypesPanelProps {
  types: string[];
  isLoading: boolean;
  error: string | null;
  selectedDataType: string | null;
  hoveredDataType: string | null;
  deletingDataType: string | null;
  customStartDate: string;
  customEndDate: string;
  agentName: string;
  onDataTypeSelect: (type: string) => void;
  onHoverChange: (type: string | null) => void;
  onDeleteDataType: (type: string) => Promise<void>;
}

export function DataTypesPanel({
  types,
  isLoading,
  error,
  selectedDataType,
  hoveredDataType,
  deletingDataType,
  customStartDate,
  customEndDate,
  agentName,
  onDataTypeSelect,
  onHoverChange,
  onDeleteDataType,
}: DataTypesPanelProps) {
  return (
    <div className="bg-white/85 backdrop-blur-sm rounded-xl border shadow-sm">
      <div className="p-6 border-b border-border/50">
        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
          <Layers className="h-5 w-5 text-primary" />
          Data Types
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select a data type to explore its records
        </p>
      </div>

      <div className="p-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading data types...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive mb-1">Failed to load data types</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {types.length > 0 && (
          <div className="space-y-2">
            {types.map((type) => (
              <div
                key={type}
                className={`group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                  selectedDataType === type
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                    : 'border-border/30 hover:border-primary/50 hover:bg-white/90 bg-white/70'
                }`}
                onMouseEnter={() => onHoverChange(type)}
                onMouseLeave={() => onHoverChange(null)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 flex-1"
                    onClick={() => onDataTypeSelect(type)}
                  >
                    <FileText
                      className={`h-4 w-4 ${selectedDataType === type ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span
                      className={`font-medium ${
                        selectedDataType === type ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hoveredDataType === type && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {deletingDataType === type ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Data Type</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete all data for &quot;{type}&quot;? This
                              will permanently remove all records of this type from{' '}
                              <strong>{new Date(customStartDate).toLocaleDateString()}</strong> to{' '}
                              <strong>{new Date(customEndDate).toLocaleDateString()}</strong> for
                              agent <strong>{agentName}</strong>.
                              <br />
                              <br />
                              <span className="text-destructive font-medium">
                                This action cannot be undone.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteDataType(type)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingDataType === type}
                            >
                              {deletingDataType === type ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete Data'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {hoveredDataType !== type && (
                      <div
                        className={`text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                          selectedDataType === type
                            ? 'border-primary text-primary bg-primary/10'
                            : 'border-border text-muted-foreground bg-muted/50'
                        }`}
                        onClick={() => onDataTypeSelect(type)}
                      >
                        {selectedDataType === type ? 'Active' : 'Select'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
