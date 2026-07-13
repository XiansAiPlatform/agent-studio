import Link from 'next/link'
import { ArrowRight, Bot, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogLevelBadge } from '@/components/features/logs'
import type { LogEntry } from '@/app/(dashboard)/settings/logs/types'
import { formatDistanceToNow } from 'date-fns'
import { PANEL_STYLE } from './panel-style'

interface ActivityPanelProps {
  logs: LogEntry[]
  isLoading: boolean
}

function truncateMessage(message: string, maxLength = 100): string {
  return message.length > maxLength ? `${message.slice(0, maxLength)}...` : message
}

export function ActivityPanel({ logs, isLoading }: ActivityPanelProps) {
  return (
    <div className={PANEL_STYLE}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-foreground">Recent activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">From your agents and system</p>
        </div>
        {!isLoading && logs.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {Math.min(logs.length, 8)} shown
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 py-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="h-5 w-12 rounded bg-muted/50 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-full rounded bg-muted/50" />
                <div className="h-3 w-1/3 rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Zap className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Activity will appear here as your agents start working
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/agents/running">
              <Bot className="mr-2 h-3.5 w-3.5" />
              View agents
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="-mx-2 px-2 py-2 rounded-md">
              <div className="flex items-start gap-2.5">
                <LogLevelBadge level={log.level} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed break-words">
                    {truncateMessage(log.message)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground min-w-0">
                    {log.agent && (
                      <span className="inline-flex items-center gap-1 font-medium min-w-0 max-w-full">
                        <Bot className="h-3 w-3 shrink-0" />
                        <span className="truncate">{log.activation || log.agent}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground/80 truncate" suppressHydrationWarning>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3 border-t border-border/60">
        <Link
          href="/settings/logs"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 group transition-colors"
        >
          <span>All activity</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
