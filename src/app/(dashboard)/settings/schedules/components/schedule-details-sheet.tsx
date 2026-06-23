'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  CalendarClock,
  Loader2,
  Trash2,
  AlertCircle,
  CalendarDays,
  History,
  Pause,
  Play,
} from 'lucide-react'
import { Schedule, ScheduleRun } from '../types'
import { ScheduleStatusBadge, RunStatusBadge } from './schedule-status-badge'
import { formatDateTime, formatDateTimeWithSeconds, formatRelative } from '../format'
import { humanizeScheduleSpec } from '../schedule-spec'
import { fetchScheduleHistory, fetchUpcomingRuns } from '../hooks/use-schedules'
import { showErrorToast } from '@/lib/utils/error-handler'

interface ScheduleDetailsSheetProps {
  schedule: Schedule | null
  agentName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (schedule: Schedule) => void
  onTogglePause: (schedule: Schedule) => void
  isToggling?: boolean
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function RunRow({ run }: { run: ScheduleRun }) {
  const relative = formatRelative(run.scheduledTime)
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium text-foreground">
          {formatDateTimeWithSeconds(run.scheduledTime)}
          {relative && (
            <span className="ml-1 text-xs text-muted-foreground/70">({relative})</span>
          )}
        </div>
        {run.actualRunTime && (
          <div className="text-xs text-muted-foreground">
            Ran: {formatDateTimeWithSeconds(run.actualRunTime)}
          </div>
        )}
        {run.errorMessage && (
          <div className="flex items-start gap-1 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-words">{run.errorMessage}</span>
          </div>
        )}
      </div>
      <RunStatusBadge status={run.status} className="shrink-0" />
    </div>
  )
}

function RunsSection({
  title,
  icon: Icon,
  runs,
  isLoading,
  emptyLabel,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  runs: ScheduleRun[]
  isLoading: boolean
  emptyLabel: string
}) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <RunRow key={run.runId} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ScheduleDetailsSheet({
  schedule,
  agentName,
  open,
  onOpenChange,
  onDelete,
  onTogglePause,
  isToggling = false,
}: ScheduleDetailsSheetProps) {
  const [upcomingRuns, setUpcomingRuns] = useState<ScheduleRun[]>([])
  const [history, setHistory] = useState<ScheduleRun[]>([])
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    if (!open || !schedule || !agentName) return

    let cancelled = false
    setIsLoadingRuns(true)
    setIsLoadingHistory(true)
    setUpcomingRuns([])
    setHistory([])

    fetchUpcomingRuns(agentName, schedule.id, 10)
      .then((runs) => {
        if (!cancelled) setUpcomingRuns(runs)
      })
      .catch((err) => {
        if (!cancelled) showErrorToast(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRuns(false)
      })

    fetchScheduleHistory(agentName, schedule.id, 25)
      .then((runs) => {
        if (!cancelled) setHistory(runs)
      })
      .catch((err) => {
        if (!cancelled) showErrorToast(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, schedule, agentName])

  const spec = schedule ? humanizeScheduleSpec(schedule.scheduleSpec) : null

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={<CalendarClock className="h-5 w-5 text-primary" />}
      headerTitle={schedule?.description?.trim() || schedule?.workflowType || 'Schedule'}
      headerDescription={schedule?.agentName}
    >
      <SheetContent className="flex flex-col p-0">
        {schedule && spec ? (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Details</h3>
                  <ScheduleStatusBadge status={schedule.status} />
                </div>
                <div className="space-y-2 rounded-lg border border-border/60 p-4">
                  <DetailRow label="Workflow type" value={schedule.workflowType} />
                  <DetailRow
                    label="Schedule"
                    value={
                      <span className="flex flex-col items-end text-right">
                        <span>{spec.label}</span>
                        {spec.raw && spec.raw !== spec.label && (
                          <span className="font-mono text-xs text-muted-foreground">
                            {spec.raw}
                          </span>
                        )}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Next run"
                    value={formatDateTime(schedule.nextRunTime)}
                  />
                  <DetailRow
                    label="Last run"
                    value={formatDateTime(schedule.lastRunTime)}
                  />
                  <DetailRow label="Total runs" value={schedule.executionCount} />
                  <DetailRow
                    label="Created"
                    value={formatDateTime(schedule.createdAt)}
                  />
                  <DetailRow
                    label="Schedule ID"
                    value={
                      <span className="font-mono text-xs break-all">
                        {schedule.id}
                      </span>
                    }
                  />
                </div>
              </div>

              <RunsSection
                title="Upcoming runs"
                icon={CalendarDays}
                runs={upcomingRuns}
                isLoading={isLoadingRuns}
                emptyLabel="No upcoming runs scheduled."
              />

              <RunsSection
                title="Execution history"
                icon={History}
                runs={history}
                isLoading={isLoadingHistory}
                emptyLabel="No execution history yet."
              />
            </div>

            <SheetFooter className="sm:flex-row sm:justify-between">
              {schedule.status === 'Suspended' ||
              schedule.status === 'Running' ? (
                <Button
                  variant="outline"
                  disabled={isToggling}
                  onClick={() => onTogglePause(schedule)}
                >
                  {isToggling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : schedule.status === 'Suspended' ? (
                    <Play className="mr-2 h-4 w-4" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  {schedule.status === 'Suspended' ? 'Resume' : 'Pause'}
                </Button>
              ) : (
                <span />
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(schedule)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Schedule
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
