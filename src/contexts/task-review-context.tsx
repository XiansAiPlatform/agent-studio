'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TaskReviewSheet } from '@/components/features/tasks/task-review-sheet'

type TaskReviewContextValue = {
  openTask: (taskId: string) => void
  closeTask: () => void
  taskId: string | null
}

const TaskReviewContext = createContext<TaskReviewContextValue | null>(null)

export function TaskReviewProvider({ children }: { children: React.ReactNode }) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const pathname = usePathname()

  const openTask = useCallback((id: string) => {
    if (!id) return
    setTaskId(id)
  }, [])

  const closeTask = useCallback(() => {
    setTaskId(null)
  }, [])

  useEffect(() => {
    if (pathname === '/tasks' || pathname.startsWith('/tasks/')) {
      setTaskId(null)
    }
  }, [pathname])

  const value = useMemo(
    () => ({ openTask, closeTask, taskId }),
    [openTask, closeTask, taskId]
  )

  return (
    <TaskReviewContext.Provider value={value}>
      {children}
      <TaskReviewSheet
        taskId={taskId}
        open={!!taskId}
        onClose={closeTask}
      />
    </TaskReviewContext.Provider>
  )
}

export function useTaskReview() {
  return useContext(TaskReviewContext)
}

/** Opens the in-app review panel when available; otherwise goes to the tasks inbox. */
export function useOpenTaskReview() {
  const ctx = useTaskReview()
  const router = useRouter()

  return useCallback(
    (taskId: string) => {
      if (!taskId) return
      if (ctx) {
        ctx.openTask(taskId)
        return
      }
      router.push(`/tasks?task=${encodeURIComponent(taskId)}`)
    },
    [ctx, router]
  )
}
