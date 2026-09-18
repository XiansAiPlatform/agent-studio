'use client'

import Link from 'next/link'
import { ListTodo } from 'lucide-react'
import { useMyPendingTaskCount } from '@/app/(dashboard)/dashboard/hooks/use-my-pending-task-count'
import { useTenant } from '@/hooks/use-tenant'
import { cn } from '@/lib/utils'

interface PendingTasksNavButtonProps {
  className?: string
  compact?: boolean
}

export function PendingTasksNavButton({ className, compact }: PendingTasksNavButtonProps) {
  const { currentTenantId } = useTenant()
  const { count } = useMyPendingTaskCount(Boolean(currentTenantId), { pollIntervalMs: 20_000 })

  if (count <= 0) return null

  return (
    <Link
      href="/tasks?status=pending"
      aria-label={`${count === 1 ? '1 task is waiting for you' : `${count} tasks are waiting for you`}`}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
        'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200/80',
        'dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25',
        className
      )}
    >
      <ListTodo className="h-3.5 w-3.5" />
      {!compact && (
        <span className="hidden sm:inline">
          My Tasks
        </span>
      )}
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums bg-amber-800 text-amber-50 dark:bg-amber-300 dark:text-amber-950">
        {count}
      </span>
    </Link>
  )
}
