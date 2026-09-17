'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, FileText, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOpenTaskReview } from '@/contexts/task-review-context'
import {
  fetchTaskByIdClient,
  formatTaskActionLabel,
  isPendingTask,
  performTaskAction,
} from '@/lib/task-mapper'
import { refreshMyPendingTaskCounts } from '@/lib/pending-task-count-sync'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import type { Task } from '@/types/task'
import { cn } from '@/lib/utils'

interface ChatTaskCardProps {
  taskId: string
  draftPreview?: string
}

export function ChatTaskCard({ taskId, draftPreview }: ChatTaskCardProps) {
  const openTaskReview = useOpenTaskReview()
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchTaskByIdClient(taskId)
      .then((loaded) => {
        if (cancelled) return
        setTask(loaded)
        if (isPendingTask(loaded)) refreshMyPendingTaskCounts()
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [taskId])

  const pending = isPendingTask(task)
  const listedActions = (task?.content?.data?.availableActions as string[] | undefined) || []
  const actions = pending
    ? listedActions.length > 0
      ? listedActions
      : ['approve', 'reject']
    : []
  const preview =
    draftPreview?.trim() ||
    task?.content?.originalRequest?.trim() ||
    task?.description ||
    ''

  const handleAction = async (action: string) => {
    setIsActing(action)
    try {
      await performTaskAction(taskId, action)
      refreshMyPendingTaskCounts()
      showSuccessToast(
        action.toLowerCase().includes('reject') ? 'Request rejected' : 'Request approved',
        'The agent can continue with your decision.'
      )
      const refreshed = await fetchTaskByIdClient(taskId)
      setTask(refreshed)
    } catch (error) {
      showErrorToast(error, 'Could not update this request')
    } finally {
      setIsActing(null)
    }
  }

  const completedLabel = task?.content?.data?.performedAction
    ? formatTaskActionLabel(String(task.content.data.performedAction))
    : task?.status === 'rejected'
      ? 'Rejected'
      : 'Approved'

  return (
    <div
      className={cn(
        'mt-3 w-full rounded-xl border p-4 space-y-3',
        pending || !task
          ? 'border-amber-300 bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15'
          : 'border-border bg-muted/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            pending
              ? 'bg-amber-200 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : pending ? (
            <FileText className="h-4 w-4" />
          ) : task?.status === 'rejected' ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isLoading
              ? 'Checking this request…'
              : !task
                ? 'This needs your review'
                : pending
                  ? 'This needs your approval'
                  : `You ${completedLabel.toLowerCase()} this request`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {!task && !isLoading
              ? 'Open the request to approve or reject so the agent can continue.'
              : pending
                ? 'Review the details, then approve or reject so the agent can continue.'
                : 'You can still open the details if you want to look back.'}
          </p>
        </div>
      </div>

      {preview && pending && (
        <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap rounded-lg bg-background/70 px-3 py-2 border border-amber-200/60 dark:border-amber-800/40">
          {preview}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-8"
          onClick={() => openTaskReview(taskId)}
        >
          {pending ? 'Review this request' : task ? 'See details' : 'Review this request'}
        </Button>
        {pending &&
          actions.map((action) => {
            const isReject = action.toLowerCase().includes('reject')
            const isApprove = action.toLowerCase().includes('approve')
            return (
              <Button
                key={action}
                size="sm"
                variant={isReject ? 'destructive' : isApprove ? 'default' : 'outline'}
                className={cn(
                  'h-8',
                  isApprove && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
                disabled={!!isActing}
                onClick={() => handleAction(action)}
              >
                {isActing === action ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : isReject ? (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                {formatTaskActionLabel(action)}
              </Button>
            )
          })}
      </div>
    </div>
  )
}
