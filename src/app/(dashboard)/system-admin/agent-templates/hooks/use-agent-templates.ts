import { useState, useCallback } from 'react'
import { AgentTemplate, TemplateDeployments } from '../types'

const BASE_URL = '/api/system-admin/agent-templates'

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error ?? body.message ?? `${fallback} (${res.status})`)
}

interface AgentTemplatesState {
  templates: AgentTemplate[]
  isLoading: boolean
  error: string | null
}

export function useAgentTemplates() {
  const [state, setState] = useState<AgentTemplatesState>({
    templates: [],
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  /**
   * Fetch all system-wide agent templates.
   * GET /api/system-admin/agent-templates (basic definition data only).
   */
  const fetchTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch(BASE_URL)
      if (!res.ok) await parseError(res, 'Failed to load agent templates')
      const data: AgentTemplate[] = await res.json()
      setState({ templates: data ?? [], isLoading: false, error: null })
    } catch (err) {
      setState({
        templates: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  /**
   * Fetch the tenants that currently have a deployed instance of a template.
   * GET /api/system-admin/agent-templates/{templateId}/deployments
   */
  const fetchDeployments = useCallback(
    async (templateId: string): Promise<TemplateDeployments> => {
      const res = await fetch(
        `${BASE_URL}/${encodeURIComponent(templateId)}/deployments`
      )
      if (!res.ok) await parseError(res, 'Failed to load template deployments')
      return await res.json()
    },
    []
  )

  /**
   * Permanently delete an agent template.
   * DELETE /api/system-admin/agent-templates/{templateId}
   */
  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(templateId)}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        await parseError(res, 'Failed to delete agent template')
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchTemplates,
    fetchDeployments,
    deleteTemplate,
  }
}
