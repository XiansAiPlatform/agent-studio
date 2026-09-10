'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'

export type AgentLevel = 'Read' | 'Write' | 'Owner'

export interface EditableAgents {
  /** TenantAdmin / SysAdmin — may edit every agent in the tenant. */
  canEditAll: boolean
  /** Agent names the user may edit (Write/Owner). Empty when `canEditAll`. */
  editable: string[]
  /** Raw per-agent grant level, by agent name. */
  levels: Record<string, AgentLevel>
  isLoading: boolean
}

const EMPTY: Omit<EditableAgents, 'isLoading'> = {
  canEditAll: false,
  editable: [],
  levels: {},
}

/**
 * Which agents the signed-in user may open/edit in the settings area, from
 * `GET /api/agent-access`. Use it to filter agent pickers and guard pages.
 * Authorization is always re-checked server-side; this is for UX only.
 */
export function useEditableAgents(): EditableAgents {
  const { currentTenantId } = useTenant()
  const [state, setState] = useState<EditableAgents>({ ...EMPTY, isLoading: true })

  useEffect(() => {
    if (!currentTenantId) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/agent-access')
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (res.ok && data) {
          setState({
            canEditAll: !!data.canEditAll,
            editable: Array.isArray(data.editable) ? data.editable : [],
            levels: data.levels ?? {},
            isLoading: false,
          })
        } else {
          setState({ ...EMPTY, isLoading: false })
        }
      } catch {
        if (!cancelled) setState({ ...EMPTY, isLoading: false })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentTenantId])

  return state
}

/** Whether `agentName` is editable given a resolved `EditableAgents`. */
export function canEditAgent(access: EditableAgents, agentName: string | null | undefined): boolean {
  if (!agentName) return false
  return access.canEditAll || access.editable.includes(agentName)
}
