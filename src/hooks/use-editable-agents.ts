'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import {
  mayEditAgent,
  type AgentLevel,
  type AgentEditPolicy,
} from '@/lib/auth/agent-edit-policy'

export type { AgentLevel }

export interface EditableAgents extends AgentEditPolicy {
  /** Agent names with an explicit Write/Owner grant. Empty when `canEditAll`. */
  editable: string[]
  isLoading: boolean
}

const EMPTY: Omit<EditableAgents, 'isLoading'> = {
  canEditAll: false,
  roleDefaultWrite: false,
  editable: [],
  levels: {},
}

/**
 * Which agents the signed-in user may open/edit in the settings area, from
 * `GET /api/agent-access`. Settings pickers list all active agents and use this
 * to deny navigation when the user cannot edit. Authorization is always
 * re-checked server-side; this is for UX only.
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
            roleDefaultWrite: !!data.roleDefaultWrite,
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

/** Whether `agentName` is editable given a resolved edit-access snapshot. */
export function canEditAgent(
  access: Pick<EditableAgents, 'canEditAll' | 'roleDefaultWrite' | 'levels' | 'editable'>,
  agentName: string | null | undefined
): boolean {
  return mayEditAgent(access, agentName)
}
