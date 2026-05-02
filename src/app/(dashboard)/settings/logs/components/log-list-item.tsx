import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogLevelBadge } from '@/components/features/logs';
import { LogEntry } from '../types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, ChevronUp, User, Bot, Workflow, Clock, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LogMessage } from './log-message';

interface LogListItemProps {
  log: LogEntry;
  onClick?: () => void;
}

export function LogListItem({ log, onClick }: LogListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedTime = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
  const absoluteTime = new Date(log.createdAt).toLocaleString();

  const hasException = !!log.exception;
  const hasProperties = log.properties && Object.keys(log.properties).length > 0;
  const hasMetadataDetails = hasException || hasProperties || !!log.workflowRunId;

  // A message is considered "long" when it has many characters or many lines.
  // When long and collapsed, we clip it visually with a max-height + fade and
  // let the existing expand toggle reveal the rest.
  const messageText = log.message ?? '';
  const messageLineCount = messageText ? messageText.split('\n').length : 0;
  const isMessageLong = messageText.length > 240 || messageLineCount > 3;

  // Rough estimate of how many lines are hidden when collapsed. The clamp
  // shows ~3 lines of text-sm content (max-h-24 ≈ 6rem). We use newline count
  // as a lower bound; for soft-wrapped long lines we fall back to "more".
  const hiddenLineEstimate = Math.max(messageLineCount - 3, 0);

  const canExpand = hasMetadataDetails || isMessageLong;
  const shouldClampMessage = isMessageLong && !isExpanded;

  return (
    <Card 
      className={cn(
        'border-border/50 transition-all cursor-pointer',
        !hasException && 'hover:border-border',
        hasException && 'border-l-4 border-l-red-500 rounded-l-none hover:shadow-lg hover:bg-accent/5',
        isExpanded && 'shadow-md'
      )}
      onClick={() => {
        if (onClick) onClick();
        else setIsExpanded(!isExpanded);
      }}
    >
      <CardContent className="!px-4 !py-3">
        <div className="space-y-2">
          {/* Header Row */}
          <div className="flex items-start gap-3">
            {/* Expand/Collapse Icon */}
            {canExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 shrink-0 hover:bg-accent rounded p-0.5 transition-colors"
                aria-label={isExpanded ? 'Collapse log entry' : 'Expand log entry'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}

            {/* Log Level Badge */}
            <div className={cn("shrink-0", !canExpand && "ml-1")}>
              <LogLevelBadge level={log.level} />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Message (markdown) — clipped with a fade when long & collapsed */}
              <div
                className={cn(
                  'relative',
                  shouldClampMessage && 'max-h-24 overflow-hidden'
                )}
              >
                <LogMessage
                  message={log.message}
                  mode="block"
                  className={cn(hasException && '[&_p]:font-medium')}
                />
                {shouldClampMessage && (
                  <>
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/90 to-transparent"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center pb-0.5 text-muted-foreground"
                    >
                      <span className="text-xs font-mono leading-none">···</span>
                    </div>
                  </>
                )}
              </div>
              {isMessageLong && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                    'text-primary hover:bg-primary/10 focus-visible:bg-primary/10',
                    'border border-dashed border-primary/40 hover:border-primary/60'
                  )}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      {hiddenLineEstimate > 0
                        ? `Show ${hiddenLineEstimate} more line${hiddenLineEstimate === 1 ? '' : 's'}`
                        : 'Show full message'}
                    </>
                  )}
                </button>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
                {/* Timestamp */}
                <div className="flex items-center gap-1" title={absoluteTime}>
                  <Clock className="h-3 w-3" />
                  <span>{formattedTime}</span>
                </div>

                {/* Agent & Activation (activation hidden on mobile) */}
                {log.agent && (
                  <div className="flex items-center gap-1 min-w-0">
                    <Bot className="h-3 w-3 shrink-0" />
                    <span className="font-medium truncate">{log.agent}</span>
                    {log.activation && (
                      <>
                        <span className="hidden sm:inline text-muted-foreground/50">•</span>
                        <span className="hidden sm:inline text-muted-foreground/80 truncate">{log.activation}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Participant — desktop only */}
                {log.participantId && (
                  <div className="hidden sm:flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{log.participantId}</span>
                  </div>
                )}

                {/* Workflow Type — desktop only */}
                {log.workflowType && (
                  <div className="hidden sm:flex items-center gap-1">
                    <Workflow className="h-3 w-3" />
                    <span className="text-muted-foreground/80">{log.workflowType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && hasMetadataDetails && (
            <div className="ml-0 sm:ml-8 mt-3 space-y-3 text-xs">
              {/* Exception Details */}
              {hasException && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-red-900 dark:text-red-200">Exception</span>
                  </div>
                  <pre className="text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap font-mono overflow-x-auto">
                    {log.exception}
                  </pre>
                </div>
              )}

              {/* Mobile-only secondary metadata (hidden in collapsed view on phones) */}
              <div className="sm:hidden space-y-1 text-muted-foreground">
                {log.activation && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Activation:</span>
                    <span className="break-all">{log.activation}</span>
                  </div>
                )}
                {log.participantId && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Participant:</span>
                    <span className="break-all">{log.participantId}</span>
                  </div>
                )}
                {log.workflowType && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground">Workflow:</span>
                    <span className="break-all">{log.workflowType}</span>
                  </div>
                )}
              </div>

              {/* Workflow IDs */}
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                  <span className="font-medium text-foreground sm:min-w-[100px]">Workflow ID:</span>
                  <span className="font-mono text-xs break-all">{log.workflowId}</span>
                </div>
                {log.workflowRunId && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                    <span className="font-medium text-foreground sm:min-w-[100px]">Run ID:</span>
                    <span className="font-mono text-xs break-all">{log.workflowRunId}</span>
                  </div>
                )}
              </div>

              {/* Custom Properties */}
              {hasProperties && (
                <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
                  <div className="font-semibold text-foreground mb-2">Properties</div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(log.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
