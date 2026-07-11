'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, User as UserIcon, MessageSquareText } from 'lucide-react';
import { MessageItem } from '@/components/features/conversations/message-item';
import { mapXiansMessageToMessage } from '@/app/(dashboard)/conversations/utils';
import { getReasonLabel } from '@/components/features/conversations/message-feedback';
import { cn } from '@/lib/utils';
import { StarRating } from './feedback-list';
import type { FeedbackDetailResponse } from '../types';

interface FeedbackDetailProps {
  feedbackId: string;
  onBack: () => void;
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

export function FeedbackDetail({ feedbackId, onBack }: FeedbackDetailProps) {
  const [data, setData] = useState<FeedbackDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/messaging/feedback/${encodeURIComponent(feedbackId)}?contextBefore=5&contextAfter=5`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || `Request failed (${res.status})`
          );
        }
        const json = (await res.json()) as FeedbackDetailResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feedback detail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [feedbackId]);

  const feedback = data?.feedback;
  const reason = getReasonLabel(feedback?.reasonCategory);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="h-8 -ml-1">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to feedback
      </Button>

      {error && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
          </CardContent>
        </Card>
      )}

      {feedback && (
        <>
          {/* Feedback summary */}
          <Card>
            <CardContent className="space-y-3 px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StarRating rating={feedback.starRating} />
                  {reason && (
                    <Badge variant="secondary" className="font-normal">
                      {reason}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {feedback.submittedBy}
                  <span className="mx-1.5 text-muted-foreground/40">•</span>
                  {formatDateTime(feedback.submittedAt)}
                </div>
              </div>

              {feedback.comment && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="whitespace-pre-wrap text-foreground">{feedback.comment}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  {feedback.agentName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  {feedback.participantId}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Thread context */}
          <Card>
            <CardContent className="px-4 py-5 sm:px-6">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Conversation thread
              </p>
              <div className="space-y-6">
                {data!.messages.map((raw) => {
                  const msg = mapXiansMessageToMessage(raw);
                  const isRated = msg.id === data!.ratedMessageId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        isRated &&
                          'rounded-xl bg-amber-400/10 p-3 ring-1 ring-amber-400/40'
                      )}
                    >
                      {isRated && (
                        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Rated message
                        </p>
                      )}
                      <MessageItem
                        message={msg}
                        agentName={feedback.agentName}
                        disableFeedback
                      />
                    </div>
                  );
                })}
                {data!.messages.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No surrounding messages found for this thread.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
