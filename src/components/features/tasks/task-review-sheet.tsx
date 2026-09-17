'use client'

import { useEffect, useState } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { TaskDetail } from '@/components/features/tasks/task-detail'
import { fetchTaskByIdClient } from '@/lib/task-mapper'
import type { Task } from '@/types/task'

interface TaskReviewSheetProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onActionComplete?: (taskId: string) => void
}

export function TaskReviewSheet({
  taskId,
  open,
  onClose,
  onActionComplete,
}: TaskReviewSheetProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null)
      setError(null)
      return
    }

    const abortController = new AbortController()
    setIsLoading(true)
    setError(null)

    fetchTaskByIdClient(taskId)
      .then((loaded) => {
        if (abortController.signal.aborted) return
        if (!loaded) {
          setTask(null)
          setError('This request could not be found, or you may not have access to it.')
          return
        }
        setTask(loaded)
      })
      .catch(() => {
        if (abortController.signal.aborted) return
        setTask(null)
        setError('This request could not be loaded. Try again in a moment.')
      })
      .finally(() => {
        if (!abortController.signal.aborted) setIsLoading(false)
      })

    return () => abortController.abort()
  }, [open, taskId])

  const handleActionComplete = (completedId: string) => {
    onActionComplete?.(completedId)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      headerIcon={<CheckSquare className="h-5 w-5 text-amber-500" />}
      headerTitle="Review this request"
      headerDescription={task?.title || 'The agent is waiting for your decision'}
    >
      <SheetContent className="flex flex-col p-0">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading this request…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Unable to open this request</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : task ? (
            <TaskDetail
              task={task}
              onApprove={handleActionComplete}
              onReject={handleActionComplete}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
