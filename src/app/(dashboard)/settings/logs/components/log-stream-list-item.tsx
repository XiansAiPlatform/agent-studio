import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogLevelBadge } from '@/components/features/logs';
import { LogStream } from '../types';
import { cn } from '@/lib/utils';
import { Bot, Workflow, Clock, MessageSquare, ChevronRight, FileText } from 'lucide-react';
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
  const isError = String(stream.lastLogLevel).toLowerCase() === 'error';

  return (
    <Card
      className={cn(
        'border-border/50 transition-all cursor-pointer group',
        'hover:border-border hover:shadow-sm',
        isError && 'border-l-4 border-l-red-500 rounded-l-none'
      )}
      onClick={() => onSelect(stream)}
    >
      <CardContent className="!px-4 !py-3">
        <div className="flex items-start gap-3">
          {/* Stat card: total log count for this stream */}
          <div
            className={cn(
              'shrink-0 self-stretch flex flex-col items-center justify-center',
              'min-w-[64px] px-2 py-1.5 rounded-lg border',
              isError
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200'
                : 'bg-muted/40 border-border/60 text-foreground'
            )}
            title={`${stream.logCount.toLocaleString()} log${stream.logCount === 1 ? '' : 's'} in this stream`}
          >
            <span className="text-lg font-semibold leading-none tabular-nums">
              {formatCount(stream.logCount)}
            </span>
            <span
              className={cn(
                'text-[10px] uppercase tracking-wide leading-none mt-1',
                isError ? 'text-red-700/80 dark:text-red-300/80' : 'text-muted-foreground'
              )}
            >
              {stream.logCount === 1 ? 'log' : 'logs'}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <LogLevelBadge level={stream.lastLogLevel} className="shrink-0" />
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <LogMessage
                message={stream.lastLogMessage}
                mode="inline"
                className={cn('text-sm text-foreground flex-1', isError && 'font-medium')}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" title={lastSeenAbsolute}>
                <Clock className="h-3 w-3" />
                <span>{lastSeen}</span>
              </div>

              {stream.agent && (
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  <span className="font-medium">{stream.agent}</span>
                  {stream.activation && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-muted-foreground/80">{stream.activation}</span>
                    </>
                  )}
                </div>
              )}

              {stream.workflowType && (
                <div className="flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  <span className="text-muted-foreground/80">{stream.workflowType}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-mono truncate">
              <span className="text-muted-foreground/60">workflow:</span>
              <span className="truncate" title={stream.workflowId}>{stream.workflowId}</span>
            </div>
          </div>

          <div className="shrink-0 self-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:hidden" />
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(stream);
              }}
              className="hidden group-hover:inline-flex focus-visible:inline-flex h-8 rounded-lg gap-1.5"
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
