'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  Running:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  Completed:
    'bg-primary/15 text-primary border-primary/30 dark:bg-primary/20',
  Failed:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  Canceled: 'bg-muted text-muted-foreground border-border',
  Cancelled: 'bg-muted text-muted-foreground border-border',
  Terminated:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
  TimedOut:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50',
  ContinuedAsNew:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
}

export function WorkflowStatusBadge({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  const label = status?.trim() || 'Unknown'
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_STYLES[label] ?? 'bg-muted text-muted-foreground border-border', className)}
    >
      {label}
    </Badge>
  )
}
