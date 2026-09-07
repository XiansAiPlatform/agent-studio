'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import type { AuditActivityDocument, AuditActivityListResponse } from '../types';

interface AuditActivityListProps {
  data: AuditActivityListResponse | null;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AuditActivityRow({ item }: { item: AuditActivityDocument }) {
  return (
    <div className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left text-sm">
      <div className="col-span-6 min-w-0 truncate font-medium sm:col-span-3" title={item.action}>
        {item.action}
      </div>
      <div className="col-span-6 min-w-0 truncate text-muted-foreground sm:col-span-3" title={item.performedBy}>
        {item.performedBy}
      </div>
      <div className="col-span-6 min-w-0 sm:col-span-3">
        {item.activationName ? (
          <Badge variant="secondary" className="max-w-full truncate font-normal">
            {item.activationName}
          </Badge>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
      <div className="col-span-12 truncate text-xs text-muted-foreground sm:col-span-3 sm:text-right">
        {formatDateTime(item.createdAt)}
      </div>
    </div>
  );
}

export function AuditActivityList({ data, loading, error, onPageChange }: AuditActivityListProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <PageLoader label="Loading audit activities..." />
        </CardContent>
      </Card>
    );
  }

  if (data.activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-foreground">No audit activities found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting the filters or check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { activities, page, totalPages, totalCount } = data;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        {/* Header row (desktop) */}
        <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <div className="col-span-3">Action</div>
          <div className="col-span-3">Performed By</div>
          <div className="col-span-3">Activation</div>
          <div className="col-span-3 text-right">When</div>
        </div>

        <div className="divide-y divide-border/50">
          {activities.map((item) => (
            <AuditActivityRow key={item.id} item={item} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {Math.max(totalPages, 1)} · {totalCount.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
