/**
 * Hook to load and change an activation's evals.
 * The activation is picked by agent name and activation name; the API route finds its id.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { useResolvedLoading } from '@/hooks/use-resolved-loading'
import type { AgentEval, EvalRequest, EvalRunPage, EvalSummary, EvalsListResponse, EvalStatus } from '../types'

interface ActivationRef {
  agentName?: string | null
  activationName?: string | null
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new Error(body.error || fallback)
}

function activationQuery({ agentName, activationName }: ActivationRef, extra?: Record<string, string>) {
  const params = new URLSearchParams({ agentName: agentName ?? '', activationName: activationName ?? '' })
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value)
  return params.toString()
}

export async function fetchEvalRuns(
  ref: ActivationRef,
  checkId: string,
  options: { page?: number; pageSize?: number; status?: EvalStatus | 'all' } = {}
): Promise<EvalRunPage> {
  const extra: Record<string, string> = {
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20),
  }
  if (options.status && options.status !== 'all') extra.status = options.status

  const response = await fetch(`/api/evals/${encodeURIComponent(checkId)}/runs?${activationQuery(ref, extra)}`)
  if (!response.ok) await parseError(response, 'Failed to load run history')
  return response.json()
}

export function useEvals(ref: ActivationRef) {
  const { currentTenantId } = useTenant()
  const [data, setData] = useState<EvalsListResponse | undefined>(undefined)
  const [summary, setSummary] = useState<EvalSummary | undefined>(undefined)
  /** The activation the loaded data belongs to, so old data isn't shown after switching. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ready = Boolean(ref.agentName && ref.activationName)
  const key = useMemo(
    () => JSON.stringify({ tenantId: currentTenantId, agentName: ref.agentName, activationName: ref.activationName }),
    [currentTenantId, ref.agentName, ref.activationName]
  )
  const { isLoading, resolve } = useResolvedLoading(ready ? key : null, false)

  // State is only set after the first await, so this is safe to call from an effect.
  // With no activation selected, the values below are simply empty.
  const load = useCallback(async () => {
    if (!ready) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const query = activationQuery(ref)
      const [listResponse, summaryResponse] = await Promise.all([
        fetch(`/api/evals?${query}`, { signal: controller.signal }),
        fetch(`/api/evals/summary?${query}`, { signal: controller.signal }),
      ])
      if (!listResponse.ok) await parseError(listResponse, 'Failed to load evals')
      setData(await listResponse.json())
      // If the summary fails, still show the list.
      setSummary(summaryResponse.ok ? await summaryResponse.json() : undefined)
      setError(null)
      setLoadedKey(key)
      resolve(key)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to load evals'))
      resolve(key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, resolve])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  const createEval = useCallback(
    async (request: EvalRequest): Promise<AgentEval> => {
      const response = await fetch(`/api/evals?${activationQuery(ref)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!response.ok) await parseError(response, 'Failed to create eval')
      const created = (await response.json()) as AgentEval
      await load()
      return created
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref.agentName, ref.activationName, load]
  )

  const updateEval = useCallback(
    async (checkId: string, request: EvalRequest): Promise<AgentEval> => {
      const response = await fetch(`/api/evals/${encodeURIComponent(checkId)}?${activationQuery(ref)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!response.ok) await parseError(response, 'Failed to update eval')
      const updated = (await response.json()) as AgentEval
      await load()
      return updated
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref.agentName, ref.activationName, load]
  )

  const deleteEval = useCallback(
    async (checkId: string) => {
      const response = await fetch(`/api/evals/${encodeURIComponent(checkId)}?${activationQuery(ref)}`, {
        method: 'DELETE',
      })
      if (!response.ok) await parseError(response, 'Failed to delete eval')
      await load()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref.agentName, ref.activationName, load]
  )

  const current = ready && loadedKey === key

  return {
    evals: current ? data?.checks : undefined,
    activationActive: current ? data?.activation.isActive : undefined,
    summary: current ? summary : undefined,
    isLoading,
    error: ready ? error : null,
    refetch: load,
    createEval,
    updateEval,
    deleteEval,
  }
}
