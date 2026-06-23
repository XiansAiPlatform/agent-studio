'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScheduleRunStatus, ScheduleStatus } from '../types'

const SCHEDULE_STATUS_STYLES: Record<ScheduleStatus, string> = {
  Running:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  Suspended:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
  Completed:
    'bg-primary/15 text-primary border-primary/30 dark:bg-primary/20',
  Failed:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  Canceled: 'bg-muted text-muted-foreground border-border',
  Terminated:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  TimedOut:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50',
  ContinuedAsNew:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
}

const RUN_STATUS_STYLES: Record<ScheduleRunStatus, string> = {
  Scheduled:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
  Running:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  Completed:
    'bg-primary/15 text-primary border-primary/30 dark:bg-primary/20',
  Failed:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  Skipped: 'bg-muted text-muted-foreground border-border',
}

export function ScheduleStatusBadge({
  status,
  className,
}: {
  status: ScheduleStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(SCHEDULE_STATUS_STYLES[status] ?? '', className)}
    >
      {status}
    </Badge>
  )
}

export function RunStatusBadge({
  status,
  className,
}: {
  status: ScheduleRunStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(RUN_STATUS_STYLES[status] ?? '', className)}
    >
      {status}
    </Badge>
  )
}
