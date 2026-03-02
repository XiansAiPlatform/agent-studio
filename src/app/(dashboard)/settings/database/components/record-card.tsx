'use client';

import { Badge } from '@/components/ui/badge';
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
import {
  Database,
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { type DataRecord } from '../types';
import { formatDate, formatContentKey } from '../utils';

interface RecordCardProps {
  record: DataRecord;
  isExpanded: boolean;
  isHovered: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onHoverChange: (hovered: boolean) => void;
  onDelete: () => Promise<void>;
}

function ContentSection({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {Object.entries(content).map(([key, value]) => (
        <div
          key={key}
          className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
        >
          <span className="text-xs font-normal text-slate-400 capitalize min-w-0 mt-2.5">
            {formatContentKey(key)}:
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-600 font-mono bg-white/60 px-2 py-1.5 rounded border border-slate-100 break-all">
              {typeof value === 'object' && value !== null ? (
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <span className="text-slate-600">{String(value)}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordCard({
  record,
  isExpanded,
  isHovered,
  isDeleting,
  onToggle,
  onHoverChange,
  onDelete,
}: RecordCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-white via-white to-slate-50/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />

      <div
        className="relative flex items-center justify-between p-6 cursor-pointer hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent transition-all duration-200"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4 flex-1">
          <div
            className={`flex-shrink-0 mt-1 p-2 rounded-xl transition-all duration-200 ${
              isExpanded
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-normal text-slate-600 break-all leading-relaxed">
                {record.key}
              </p>
              <Badge
                variant="secondary"
                className="ml-3 bg-slate-100 text-slate-500 border-slate-200 font-normal px-2 py-1 text-xs"
              >
                {Object.keys(record.content).length} fields
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50/80 text-slate-500 px-2 py-0.5 text-xs font-normal"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                {record.participantId}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{formatDate(record.createdAt)}</span>
                {isHovered && (
                  <>
                    <span className="text-slate-300">•</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="text-xs text-destructive hover:text-destructive/80 underline transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isDeleting ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              deleting...
                            </span>
                          ) : (
                            'delete'
                          )}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Record</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this data record?
                            <br />
                            <br />
                            <strong>Record Key:</strong> {record.key}
                            <br />
                            <strong>Record ID:</strong> {record.id}
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
                            onClick={onDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Delete Record'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="relative border-t border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-white">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Content</span>
              </div>
              <div className="bg-slate-50/50 rounded-lg p-4 space-y-2 border border-slate-200/40">
                <ContentSection content={record.content} />
              </div>
            </div>

            {record.metadata && Object.keys(record.metadata).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">Metadata</span>
                </div>
                <div className="bg-slate-50/50 rounded-lg p-4 space-y-2 border border-slate-200/40">
                  <ContentSection content={record.metadata} />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                <span>ID: {record.id}</span>
                <span>•</span>
                <span>Created: {formatDate(record.createdAt)}</span>
                {record.updatedAt && (
                  <>
                    <span>•</span>
                    <span>Updated: {formatDate(record.updatedAt)}</span>
                  </>
                )}
                {record.expiresAt && (
                  <>
                    <span>•</span>
                    <span>Expires: {formatDate(record.expiresAt)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
