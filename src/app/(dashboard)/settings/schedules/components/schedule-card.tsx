'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Repeat, Trash2, Workflow, Hash, Pause, Play } from 'lucide-react'
import { Schedule } from '../types'
import { ScheduleStatusBadge } from './schedule-status-badge'
import { formatDateTime, formatRelative } from '../format'
import { humanizeScheduleSpec } from '../schedule-spec'

interface ScheduleCardProps {
  schedule: Schedule
  onClick: (schedule: Schedule) => void
  onDelete: (schedule: Schedule) => void
  onTogglePause: (schedule: Schedule) => void
  isToggling?: boolean
}

export function ScheduleCard({
  schedule,
  onClick,
  onDelete,
  onTogglePause,
  isToggling = false,
}: ScheduleCardProps) {
  const nextRunRelative = formatRelative(schedule.nextRunTime)
  const spec = humanizeScheduleSpec(schedule.scheduleSpec)
  const isPaused = schedule.status === 'Suspended'
  const canToggle = isPaused || schedule.status === 'Running'

  return (
    <Card
      onClick={() => onClick(schedule)}
      className="group cursor-pointer p-4 transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="truncate font-medium text-foreground group-hover:text-primary">
              {schedule.description?.trim() || schedule.workflowType}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ScheduleStatusBadge status={schedule.status} />
            <span
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              title={spec.raw ?? spec.label}
            >
              <Repeat className="h-3 w-3" />
              {spec.label}
            </span>
          </div>

          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Next run: {formatDateTime(schedule.nextRunTime)}
              {nextRunRelative && (
                <span className="text-muted-foreground/70">({nextRunRelative})</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              {schedule.executionCount} run{schedule.executionCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              disabled={isToggling}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePause(schedule)
              }}
              aria-label={isPaused ? 'Resume schedule' : 'Pause schedule'}
              title={isPaused ? 'Resume schedule' : 'Pause schedule'}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(schedule)
            }}
            aria-label="Delete schedule"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
