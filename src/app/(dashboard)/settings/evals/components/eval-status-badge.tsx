'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertTriangle, CircleDashed, PauseCircle } from 'lucide-react'
import type { ActivationHealth, EvalStatus } from '../types'

const GREEN = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50'
const RED = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50'
const ORANGE = 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50'
const AMBER = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50'
const MUTED = 'bg-muted text-muted-foreground border-border'

const STATUS: Record<EvalStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pass: { label: 'Passing', className: GREEN, icon: CheckCircle2 },
  fail: { label: 'Failing', className: RED, icon: XCircle },
  error: { label: 'Error', className: ORANGE, icon: AlertTriangle },
}

/**
 * Latest result of one eval. `fail` = the agent answered but wrongly;
 * `error` = no answer could be obtained (timeout, no worker, exception).
 */
export function EvalStatusBadge({
  status,
  enabled = true,
  paused = false,
  className,
}: {
  status?: EvalStatus | null
  enabled?: boolean
  paused?: boolean
  className?: string
}) {
  if (!enabled || paused) {
    return (
      <Badge variant="outline" className={cn(MUTED, 'gap-1', className)}>
        <PauseCircle className="h-3 w-3" />
        {enabled ? 'Paused' : 'Disabled'}
      </Badge>
    )
  }

  if (!status) {
    return (
      <Badge variant="outline" className={cn(MUTED, 'gap-1', className)}>
        <CircleDashed className="h-3 w-3" />
        No runs yet
      </Badge>
    )
  }

  const { label, className: tone, icon: Icon } = STATUS[status]
  return (
    <Badge variant="outline" className={cn(tone, 'gap-1', className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

/** Status of a single run in the history list. */
export function RunStatusBadge({ status, className }: { status: EvalStatus; className?: string }) {
  const { className: tone, icon: Icon } = STATUS[status]
  return (
    <Badge variant="outline" className={cn(tone, 'gap-1 capitalize', className)}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  )
}

const HEALTH: Record<ActivationHealth, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: GREEN },
  degraded: { label: 'Degraded', className: AMBER },
  unhealthy: { label: 'Unhealthy', className: RED },
  unknown: { label: 'No results yet', className: MUTED },
}

export function ActivationHealthBadge({ health, className }: { health: ActivationHealth; className?: string }) {
  const { label, className: tone } = HEALTH[health]
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      {label}
    </Badge>
  )
}
