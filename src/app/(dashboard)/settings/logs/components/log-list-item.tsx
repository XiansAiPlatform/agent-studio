import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogLevelBadge } from '@/components/features/logs';
import { LogEntry } from '../types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, User, Bot, Workflow, Clock, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const hasDetails = hasException || hasProperties || log.workflowRunId;

  return (
    <Card 
      className={cn(
        'border-border/50 transition-all hover:border-border cursor-pointer',
        hasException && 'border-l-4 border-l-red-500',
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
            {hasDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="mt-1 shrink-0 hover:bg-accent rounded p-0.5 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            
            {/* Log Level Badge */}
            <div className={cn("shrink-0", !hasDetails && "ml-1")}>
              <LogLevelBadge level={log.level} />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Message */}
              <p className={cn(
                "text-sm text-foreground",
                hasException && "font-medium"
              )}>
                {log.message}
              </p>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {/* Timestamp */}
                <div className="flex items-center gap-1" title={absoluteTime}>
                  <Clock className="h-3 w-3" />
                  <span>{formattedTime}</span>
                </div>

                {/* Agent & Activation */}
                {log.agent && (
                  <div className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    <span className="font-medium">{log.agent}</span>
                    {log.activation && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground/80">{log.activation}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Participant */}
                {log.participantId && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{log.participantId}</span>
                  </div>
                )}

                {/* Workflow Type */}
                {log.workflowType && (
                  <div className="flex items-center gap-1">
                    <Workflow className="h-3 w-3" />
                    <span className="text-muted-foreground/80">{log.workflowType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && hasDetails && (
            <div className="ml-8 mt-3 space-y-3 text-xs">
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

              {/* Workflow IDs */}
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground min-w-[100px]">Workflow ID:</span>
                  <span className="font-mono text-xs break-all">{log.workflowId}</span>
                </div>
                {log.workflowRunId && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground min-w-[100px]">Run ID:</span>
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
