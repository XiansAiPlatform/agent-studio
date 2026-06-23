/**
 * Types for the Agent Schedules feature.
 *
 * Mirrors the backend AdminApi schedule models (Shared.Models.Schedule.*).
 * The backend serializes with camelCase property names and string enums
 * (JsonStringEnumConverter), so these types use the same casing.
 */

/** Matches Shared.Models.Schedule.ScheduleStatus (Temporal workflow statuses). */
export type ScheduleStatus =
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Canceled'
  | 'Terminated'
  | 'TimedOut'
  | 'ContinuedAsNew'
  | 'Suspended'

/** Matches Shared.Models.Schedule.ScheduleRunStatus. */
export type ScheduleRunStatus =
  | 'Scheduled'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Skipped'

/** Matches Shared.Models.Schedule.ScheduleModel. */
export interface Schedule {
  id: string
  tenantId?: string
  agentName: string
  workflowType: string
  scheduleSpec: string
  nextRunTime: string
  createdAt: string
  status: ScheduleStatus
  metadata?: Record<string, unknown>
  description?: string | null
  lastRunTime?: string | null
  executionCount: number
}

/** Matches Shared.Models.Schedule.ScheduleRunModel. */
export interface ScheduleRun {
  runId: string
  scheduleId: string
  scheduledTime: string
  actualRunTime?: string | null
  status: ScheduleRunStatus
  workflowRunId?: string | null
  errorMessage?: string | null
}

/** Matches ScheduleService.ScheduleDeleteResult. */
export interface ScheduleDeleteResult {
  deletedCount: number
  deletedScheduleIds: string[]
  failedScheduleIds: string[]
}

export const SCHEDULE_STATUS_OPTIONS: ScheduleStatus[] = [
  'Running',
  'Suspended',
  'Completed',
  'Failed',
  'Canceled',
  'Terminated',
  'TimedOut',
  'ContinuedAsNew',
]
