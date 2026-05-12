'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import type { Message } from '@/lib/data/dummy-conversations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { showErrorToast } from '@/lib/utils/error-handler';

const OTHER_REASON = 'Other' as const

const LEGACY_REASON_LABELS: Record<string, string> = {
  NotAccurate: 'Not accurate',
  Irrelevant: 'Irrelevant',
  MissingInstructions: 'Missing instructions',
  IncompleteResponse: 'Incomplete response',
}

const REASON_OPTIONS = [
  { value: 'FactuallyIncorrect', label: 'Factually incorrect' },
  { value: 'MissingImportantDetails', label: 'Missing important details' },
  { value: 'DidNotAnswerActualQuestion', label: 'Did not answer the actual question' },
  { value: 'ResponseTooGeneric', label: 'Response was too generic' },
  { value: 'ResponseTooLong', label: 'Response was too long' },
  { value: 'ResponseDifficultToUnderstand', label: 'Response was difficult to understand' },
  { value: 'FabricatedInformation', label: 'Fabricated information' },
  { value: 'WrongAssumptionsOrContext', label: 'Wrong assumptions/context' },
  { value: 'FailedToFollowConstraints', label: 'Failed to follow constraints' },
  { value: 'ToolActionFailure', label: 'Tool/action failure' },
  { value: 'UnsafeOrRiskyOutput', label: 'Unsafe/risky output' },
  { value: 'PoorCodeQuality', label: 'Poor code quality' },
  { value: 'PerformanceIssue', label: 'Performance issue' },
  { value: OTHER_REASON, label: 'Other' },
] as const

export interface MessageFeedbackProps {
  message: Message;
  agentName: string;
  onFeedbackSubmitted?: (
    messageId: string,
    feedback: NonNullable<Message['feedback']>
  ) => void;
}

export function MessageFeedback({
  message,
  agentName,
  onFeedbackSubmitted,
}: MessageFeedbackProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [starRating, setStarRating] = useState(0);
  const [reasonCategory, setReasonCategory] = useState<string>('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fb = message.feedback;
  const hasRouting =
    !!message.threadId &&
    !!message.workflowId &&
    !!message.workflowType &&
    !!message.participantId;

  if (message.role !== 'agent' || !hasRouting) {
    return null;
  }

  if (fb) {
    return (
      <div className="flex items-center gap-0.5 px-1 mt-1 text-xs text-muted-foreground">
        <span className="mr-1">Your rating:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-3.5 w-3.5 ${
              n <= fb.starRating
                ? 'fill-amber-400 text-amber-500'
                : 'text-muted-foreground/40'
            }`}
          />
        ))}
        {fb.reasonCategory && (
          <span className="ml-2 text-[10px]">
            (
            {REASON_OPTIONS.find((o) => o.value === fb.reasonCategory)?.label ??
              LEGACY_REASON_LABELS[fb.reasonCategory] ??
              fb.reasonCategory}
            )
          </span>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (starRating < 1 || starRating > 5) {
      showErrorToast(new Error('Pick a star rating'), 'Rating required');
      return;
    }
    if (starRating < 4 && !reasonCategory) {
      showErrorToast(new Error('Select a reason'), 'Reason required');
      return;
    }
    if (
      starRating < 4 &&
      reasonCategory === OTHER_REASON &&
      !comment.trim()
    ) {
      showErrorToast(
        new Error('Add a comment when Other is selected'),
        'Comment required'
      );
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        messageId: message.id,
        threadId: message.threadId,
        agentName,
        workflowId: message.workflowId,
        workflowType: message.workflowType,
        participantId: message.participantId,
        starRating,
      };
      if (starRating < 4) {
        body.reasonCategory = reasonCategory;
      }
      if (comment.trim()) {
        body.comment = comment.trim();
      }

      const res = await fetch('/api/messaging/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || `Request failed (${res.status})`
        );
      }

      const submittedAt = new Date().toISOString();
      const submittedBy =
        session?.user?.email ||
        (session?.user as { name?: string })?.name ||
        'user';
      onFeedbackSubmitted?.(message.id, {
        starRating,
        ...(starRating < 4 && reasonCategory ? { reasonCategory } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        submittedBy,
        submittedAt,
      });

      setOpen(false);
      setStarRating(0);
      setReasonCategory('');
      setComment('');
    } catch (e) {
      showErrorToast(e, 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          Rate response
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate this response</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Stars (1–5)</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= (hoveredStar || starRating);
                  return (
                    <button
                      key={n}
                      type="button"
                      className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      onMouseEnter={() => setHoveredStar(n)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setStarRating(n)}
                      aria-label={`${n} stars`}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {starRating > 0 && starRating < 4 && (
              <div>
                <Label htmlFor="feedback-reason">Reason</Label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger id="feedback-reason" className="mt-1">
                    <SelectValue placeholder="Choose a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="feedback-comment">
                {starRating > 0 && starRating < 4 && reasonCategory === OTHER_REASON
                  ? 'Comment (required)'
                  : 'Comment (optional)'}
              </Label>
              <Textarea
                id="feedback-comment"
                className="mt-1 min-h-[72px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add details…"
                required={
                  starRating > 0 && starRating < 4 && reasonCategory === OTHER_REASON
                }
                aria-required={
                  starRating > 0 && starRating < 4 && reasonCategory === OTHER_REASON
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || starRating < 1}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
