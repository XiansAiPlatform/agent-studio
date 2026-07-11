'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import { getReasonLabel } from '@/components/features/conversations/message-feedback';
import { cn } from '@/lib/utils';
import type { FeedbackListResponse, MessageFeedbackDocument } from '../types';

interface FeedbackListProps {
  data: FeedbackListResponse | null;
  loading: boolean;
  error: string | null;
  onSelect: (feedbackId: string) => void;
  onPageChange: (page: number) => void;
}

export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'h-3.5 w-3.5',
            n <= rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
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

function FeedbackRow({
  item,
  onSelect,
}: {
  item: MessageFeedbackDocument;
  onSelect: (feedbackId: string) => void;
}) {
  const reason = getReasonLabel(item.reasonCategory);
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/30"
    >
      <div className="col-span-6 min-w-0 sm:col-span-2">
        <StarRating rating={item.starRating} />
      </div>
      <div className="col-span-6 min-w-0 truncate font-medium sm:col-span-2" title={item.agentName}>
        {item.agentName}
      </div>
      <div className="col-span-6 min-w-0 sm:col-span-2">
        {reason ? (
          <Badge variant="secondary" className="max-w-full truncate font-normal">
            {reason}
          </Badge>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
      <div className="col-span-6 min-w-0 truncate text-muted-foreground sm:col-span-3" title={item.comment ?? ''}>
        {item.comment ? (
          <span className="inline-flex items-center gap-1.5">
            <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.comment}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/60">No comment</span>
        )}
      </div>
      <div className="col-span-12 truncate text-xs text-muted-foreground sm:col-span-3 sm:text-right">
        <span className="truncate">{item.submittedBy}</span>
        <span className="mx-1.5 text-muted-foreground/40">•</span>
        <span>{formatDateTime(item.submittedAt)}</span>
      </div>
    </button>
  );
}

export function FeedbackList({
  data,
  loading,
  error,
  onSelect,
  onPageChange,
}: FeedbackListProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="space-y-2 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-foreground">No feedback found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting the filters or check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { items, page, totalPages, totalCount } = data;

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="px-0">
        {/* Header row (desktop) */}
        <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-muted/30 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <div className="col-span-2">Rating</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-2">Reason</div>
          <div className="col-span-3">Comment</div>
          <div className="col-span-3 text-right">Submitted</div>
        </div>

        <div className="divide-y divide-border/50">
          {items.map((item) => (
            <FeedbackRow key={item.id} item={item} onSelect={onSelect} />
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
