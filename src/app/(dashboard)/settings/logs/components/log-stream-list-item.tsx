import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogLevelBadge } from '@/components/features/logs';
import { LogStream } from '../types';
import { cn } from '@/lib/utils';
import { Bot, Workflow, Clock, MessageSquare, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LogMessage } from './log-message';

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10_000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (count < 1_000_000) return Math.round(count / 1000) + 'k';
  return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

interface LogStreamListItemProps {
  stream: LogStream;
  onSelect: (stream: LogStream) => void;
}

export function LogStreamListItem({ stream, onSelect }: LogStreamListItemProps) {
  const lastSeen = formatDistanceToNow(new Date(stream.lastLogAt), { addSuffix: true });
  const lastSeenAbsolute = new Date(stream.lastLogAt).toLocaleString();
  const errorCount = stream.errorCount ?? 0;
  // Flag a stream for attention whenever it contains any error logs - not only
  // when its most recent log happens to be an error.
  const hasErrors = errorCount > 0;

  return (
    <Card
      className={cn(
        'border-border/50 transition-all cursor-pointer group',
        'hover:border-border hover:shadow-sm',
        hasErrors && 'border-l-4 border-l-red-500 rounded-l-none'
      )}
      onClick={() => onSelect(stream)}
    >
      <CardContent className="!px-3 !py-3 sm:!px-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Stat card: total log count for this stream */}
          <div
            className={cn(
              'shrink-0 self-stretch flex flex-col items-center justify-center',
              'min-w-[52px] sm:min-w-[64px] px-2 py-1.5 rounded-lg border',
              hasErrors
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
                : 'bg-muted/40 border-border/60 text-foreground'
            )}
            title={`${stream.logCount.toLocaleString()} log${stream.logCount === 1 ? '' : 's'} in this stream`}
          >
            <span className="text-base sm:text-lg font-semibold leading-none tabular-nums">
              {formatCount(stream.logCount)}
            </span>
            <span
              className={cn(
                'text-[10px] uppercase tracking-wide leading-none mt-1',
                hasErrors ? 'text-red-700/80 dark:text-red-300/80' : 'text-muted-foreground'
              )}
            >
              {stream.logCount === 1 ? 'log' : 'logs'}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-2 min-w-0">
              <MessageSquare className="hidden sm:inline-block h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
              <LogMessage
                message={stream.lastLogMessage}
                mode="inline"
                className={cn(
                  'text-sm text-foreground flex-1 min-w-0 line-clamp-2 sm:line-clamp-3',
                  hasErrors && 'font-medium'
                )}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
              {hasErrors && (
                <div
                  className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  title={`${errorCount.toLocaleString()} error log${errorCount === 1 ? '' : 's'} in this stream`}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="tabular-nums">
                    {formatCount(errorCount)} error{errorCount === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1" title={lastSeenAbsolute}>
                <Clock className="h-3 w-3" />
                <span>{lastSeen}</span>
              </div>

              {stream.agent && (
                <div className="flex items-center gap-1 min-w-0">
                  <Bot className="h-3 w-3 shrink-0" />
                  <span className="font-medium truncate">{stream.agent}</span>
                  {stream.activation && (
                    <>
                      <span className="hidden sm:inline text-muted-foreground/50">•</span>
                      <span className="hidden sm:inline text-muted-foreground/80 truncate">{stream.activation}</span>
                    </>
                  )}
                </div>
              )}

              {stream.workflowType && (
                <div className="hidden sm:flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  <span className="text-muted-foreground/80">{stream.workflowType}</span>
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono truncate">
              <span className="text-muted-foreground/60">workflow:</span>
              <span className="truncate" title={stream.workflowId}>{stream.workflowId}</span>
            </div>
          </div>

          <div className="shrink-0 self-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 sm:group-hover:hidden" />
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(stream);
              }}
              className="hidden sm:group-hover:inline-flex sm:focus-visible:inline-flex h-8 rounded-lg gap-1.5"
              aria-label="See logs for this stream"
            >
              <FileText className="h-3.5 w-3.5" />
              See logs
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
