'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Clock, MessageSquare, Pencil, Repeat, Trash2, Webhook, CalendarClock, History } from 'lucide-react'
import { formatDateTime, formatRelative } from '../../schedules/format'
import { AgentEval, EVAL_TYPE_LABELS, describeEval, formatInterval } from '../types'
import { EvalStatusBadge } from './eval-status-badge'

const TYPE_ICONS = {
  chat: MessageSquare,
  webhook: Webhook,
  schedule: CalendarClock,
} as const

interface EvalCardProps {
  evaluation: AgentEval
  activationActive: boolean
  onOpen: (evaluation: AgentEval) => void
  onEdit: (evaluation: AgentEval) => void
  onDelete: (evaluation: AgentEval) => void
  onToggleEnabled: (evaluation: AgentEval, enabled: boolean) => void
  isToggling?: boolean
}

export function EvalCard({
  evaluation,
  activationActive,
  onOpen,
  onEdit,
  onDelete,
  onToggleEnabled,
  isToggling = false,
}: EvalCardProps) {
  const TypeIcon = TYPE_ICONS[evaluation.type]
  const lastRunRelative = formatRelative(evaluation.lastRunAt)

  return (
    <Card
      onClick={() => onOpen(evaluation)}
      className="group cursor-pointer p-4 transition-all hover:border-primary/50 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="truncate font-medium text-foreground group-hover:text-primary">
              {evaluation.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <EvalStatusBadge
              status={evaluation.lastStatus}
              enabled={evaluation.enabled}
              paused={!activationActive}
            />
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {EVAL_TYPE_LABELS[evaluation.type]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3" />
              {formatInterval(evaluation.intervalMinutes)}
            </span>
            {evaluation.consecutiveFailures > 1 && (
              <span className="text-xs text-red-700 dark:text-red-300">
                {evaluation.consecutiveFailures} failures in a row
              </span>
            )}
          </div>

          <p className="truncate text-sm text-muted-foreground">{describeEval(evaluation)}</p>

          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Last run: {formatDateTime(evaluation.lastRunAt)}
              {lastRunRelative && <span className="text-muted-foreground/70">({lastRunRelative})</span>}
            </span>
            {evaluation.lastDetail && evaluation.lastStatus !== 'pass' && (
              <span className="truncate" title={evaluation.lastDetail}>
                {evaluation.lastDetail}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={evaluation.enabled}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggleEnabled(evaluation, checked)}
            aria-label={evaluation.enabled ? 'Disable eval' : 'Enable eval'}
            title={evaluation.enabled ? 'Disable eval' : 'Enable eval'}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={() => onOpen(evaluation)}
            aria-label="View run history"
            title="Run history"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={() => onEdit(evaluation)}
            aria-label="Edit eval"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(evaluation)}
            aria-label="Delete eval"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
