import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Workflow, Copy, Check } from 'lucide-react';
import { LogStream } from '../types';

interface StreamDetailsTitleProps {
  selectedStreamMeta: LogStream | null;
  selectedWorkflowId: string | null;
  onBack: () => void;
}

/**
 * Title block for the drilled-in stream logs view. Puts the back button
 * directly beside the title (the first thing users look for when they want
 * to retreat) instead of burying it in a separate banner below the header,
 * and makes the workflow ID copyable since it's often needed for support/debugging.
 */
export function StreamDetailsTitle({
  selectedStreamMeta,
  selectedWorkflowId,
  onBack,
}: StreamDetailsTitleProps) {
  const [copied, setCopied] = useState(false);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  const handleCopyWorkflowId = async () => {
    if (!selectedWorkflowId) return;
    try {
      await navigator.clipboard.writeText(selectedWorkflowId);
      setCopied(true);
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
      copiedResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[StreamDetailsTitle] Failed to copy workflow ID:', err);
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 -ml-2 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Back to streams"
          title="Back to streams"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">
          {selectedStreamMeta?.agent ?? 'Workflow stream'}
          {selectedStreamMeta?.activation && (
            <span className="text-muted-foreground font-normal text-base sm:text-lg">
              {' '}
              • {selectedStreamMeta.activation}
            </span>
          )}
        </h1>
      </div>

      {selectedStreamMeta?.workflowType && (
        <div className="mt-1 sm:mt-1.5 pl-9 text-xs sm:text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Workflow className="h-3.5 w-3.5 shrink-0" />
            {selectedStreamMeta.workflowType}
          </span>
        </div>
      )}

      {selectedWorkflowId && (
        <button
          type="button"
          onClick={handleCopyWorkflowId}
          className="mt-1 pl-9 flex w-full min-w-0 items-start gap-1.5 text-left font-mono text-[11px] sm:text-xs text-muted-foreground/80 hover:text-foreground transition-colors"
          title={copied ? 'Copied!' : `Click to copy: ${selectedWorkflowId}`}
        >
          {copied ? (
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="mt-0.5 h-3 w-3 shrink-0" />
          )}
          <span className="break-all leading-relaxed">{selectedWorkflowId}</span>
        </button>
      )}
    </div>
  );
}
