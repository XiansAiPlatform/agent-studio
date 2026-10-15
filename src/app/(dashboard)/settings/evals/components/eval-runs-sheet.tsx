'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle2, ChevronDown, History, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTimeWithSeconds, formatRelative } from '../../schedules/format'
import { AgentEval, EvalRun, EvalStatus, describeAssertion, describeEval, formatInterval } from '../types'
import { fetchEvalRuns } from '../hooks/use-evals'
import { EvalStatusBadge, RunStatusBadge } from './eval-status-badge'

const PAGE_SIZE = 20

interface EvalRunsSheetProps {
  evaluation: AgentEval | null
  agentName: string
  activationName: string
  activationActive: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function RunRow({ run }: { run: EvalRun }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = Boolean(run.responseSnippet || run.assertionResults.length > 0)

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={cn('flex w-full items-start gap-3 p-3 text-left', hasDetails && 'hover:bg-accent/20')}
      >
        <RunStatusBadge status={run.status} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-foreground">{formatDateTimeWithSeconds(run.startedAt)}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelative(run.startedAt)} · {run.durationMs} ms
            </span>
          </div>
          {run.detail && <p className="mt-1 break-words text-xs text-muted-foreground">{run.detail}</p>}
        </div>
        {hasDetails && (
          <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 border-t bg-muted/30 p-3">
          {run.assertionResults.length > 0 && (
            <ul className="space-y-1">
              {run.assertionResults.map((result, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {result.passed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span className="min-w-0 break-words">
                    <code className="rounded bg-background px-1 py-0.5">{describeAssertion(result)}</code>
                    {!result.passed && result.actual != null && (
                      <span className="ml-1 text-muted-foreground">got “{result.actual}”</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {run.responseSnippet && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Response</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-xs">
                {run.responseSnippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EvalRunsSheet({
  evaluation,
  agentName,
  activationName,
  activationActive,
  open,
  onOpenChange,
}: EvalRunsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl">
        {/* Re-created each time it opens, so filters and paging start fresh. */}
        {open && evaluation && (
          <EvalRuns
            key={evaluation.id}
            evaluation={evaluation}
            agentName={agentName}
            activationName={activationName}
            activationActive={activationActive}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface RunsQuery {
  page: number
  status: EvalStatus | 'all'
  /** Changed by Refresh to load the same data again. */
  nonce: number
}

function EvalRuns({
  evaluation,
  agentName,
  activationName,
  activationActive,
}: {
  evaluation: AgentEval
  agentName: string
  activationName: string
  activationActive: boolean
}) {
  const [query, setQuery] = useState<RunsQuery>({ page: 1, status: 'all', nonce: 0 })
  const [runs, setRuns] = useState<EvalRun[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State is only set when the request finishes. The handlers below set the loading state.
  useEffect(() => {
    let cancelled = false
    fetchEvalRuns({ agentName, activationName }, evaluation.id, {
      page: query.page,
      pageSize: PAGE_SIZE,
      status: query.status,
    })
      .then((result) => {
        if (cancelled) return
        setRuns((current) => (query.page > 1 ? [...current, ...result.items] : result.items))
        setTotalCount(result.totalCount)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load run history')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [agentName, activationName, evaluation.id, query])

  const reload = (patch: Partial<RunsQuery>) => {
    setIsLoading(true)
    setQuery((current) => ({ ...current, page: 1, nonce: current.nonce + 1, ...patch }))
  }

  const loadMore = () => {
    setIsLoading(true)
    setQuery((current) => ({ ...current, page: current.page + 1 }))
  }

  const status = query.status

  return (
    <>
      <div className="space-y-3 border-b px-6 pb-4 pt-6">
        <div className="flex items-center gap-3 pr-8">
          <div className="rounded-lg bg-primary/10 p-2">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <SheetTitle className="truncate text-base font-semibold">{evaluation.name}</SheetTitle>
            <SheetDescription className="mt-0.5 truncate text-sm">{describeEval(evaluation)}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <EvalStatusBadge status={evaluation.lastStatus} enabled={evaluation.enabled} paused={!activationActive} />
          <span>{formatInterval(evaluation.intervalMinutes)}</span>
          {evaluation.type !== 'schedule' && <span>· timeout {evaluation.timeoutSeconds}s</span>}
          {evaluation.lastSuccessAt && <span>· last passed {formatRelative(evaluation.lastSuccessAt)}</span>}
        </div>
        {!activationActive && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This activation is inactive, so its evals are paused. They resume when it is activated.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-6 pt-4">
        <Select value={status} onValueChange={(v) => reload({ status: v as EvalStatus | 'all' })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All runs</SelectItem>
            <SelectItem value="pass">Passed</SelectItem>
            <SelectItem value="fail">Failed</SelectItem>
            <SelectItem value="error">Errored</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalCount} runs</span>
          <Button variant="outline" size="sm" onClick={() => reload({})} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : runs.length === 0 && !isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {status === 'all'
              ? `No runs yet. This eval runs ${formatInterval(evaluation.intervalMinutes).toLowerCase()}; the first result appears after one interval.`
              : 'No runs match this filter.'}
          </p>
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}

        {isLoading && runs.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {runs.length < totalCount && (
          <Button
            variant="outline"
            className="w-full"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        )}
        <p className="pt-2 text-center text-xs text-muted-foreground">Run history is kept for 30 days by default.</p>
      </div>
    </>
  )
}
