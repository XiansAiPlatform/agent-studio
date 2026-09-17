'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMyPendingTaskCount } from '@/app/(dashboard)/dashboard/hooks/use-my-pending-task-count'
import { useTenant } from '@/hooks/use-tenant'
import { showToast } from '@/lib/toast'

const POLL_MS = 20_000

/**
 * Polls for HITL requests waiting on the signed-in user. When a new one
 * appears, shows a toast so people do not have to hunt through chat or menus.
 */
export function PendingTaskNotifier() {
  const { currentTenantId } = useTenant()
  const { count } = useMyPendingTaskCount(Boolean(currentTenantId), { pollIntervalMs: POLL_MS })
  const pathname = usePathname()
  const router = useRouter()
  const previousCountRef = useRef<number | null>(null)

  useEffect(() => {
    const previous = previousCountRef.current
    previousCountRef.current = count

    if (previous === null) return
    if (count <= previous) return
    if (pathname === '/tasks' || pathname.startsWith('/tasks/')) return

    const added = count - previous
    showToast.info({
      title: added === 1 ? 'A task is waiting for you' : `${added} tasks are waiting for you`,
      description: 'Open it to approve or reject so the agent can continue.',
      duration: 8000,
      action: {
        label: 'Review now',
        onClick: () => router.push('/tasks?status=pending'),
      },
    })
  }, [count, pathname, router])

  return null
}
