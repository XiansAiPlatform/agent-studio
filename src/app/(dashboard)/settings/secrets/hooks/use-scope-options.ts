import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentNameMap, TenantSecret } from '../types'

export interface AgentOption {
  /** Agent object id; this is what the secret's `agentId` stores. */
  id: string
  name: string
}

export interface ActivationOption {
  name: string
  agentName: string
  isActive: boolean
}

interface OptionsState<T> {
  items: T[]
  isLoading: boolean
  error: string | null
}

const INITIAL = { items: [], isLoading: false, error: null }

/**
 * Loads a list from an API route on demand (no caching: every `load()` hits
 * the API so options are always current). Newer calls abort older ones.
 */
function useOnDemandList<T>(
  fetcher: (signal: AbortSignal) => Promise<T[]>,
  errorMessage: string
) {
  const [state, setState] = useState<OptionsState<T>>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const items = await fetcherRef.current(controller.signal)
      if (controller.signal.aborted) return
      setState({ items, isLoading: false, error: null })
    } catch (err) {
      if (controller.signal.aborted) return
      setState({
        items: [],
        isLoading: false,
        error: err instanceof Error && err.message ? err.message : errorMessage,
      })
    }
  }, [errorMessage])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { ...state, load, reset }
}

async function readError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.message ?? body.error ?? fallback)
}

/** Agents deployed in the current tenant, from `GET /api/agent-deployments`. */
export function useAgentOptions() {
  return useOnDemandList<AgentOption>(async (signal) => {
    const res = await fetch('/api/agent-deployments', { cache: 'no-store', signal })
    if (!res.ok) return readError(res, 'Couldn’t load agents')
    const data = await res.json()
    const agents: Array<{ id?: string; name?: string }> = Array.isArray(data?.agents)
      ? data.agents
      : []
    return agents
      .filter((a): a is { id: string; name: string } => !!a.id && !!a.name)
      .map((a) => ({ id: a.id, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, 'Couldn’t load agents')
}

const ACTIVATION_PAGE_SIZE = 100

/** Activations of one agent, from `GET /api/agent-activations?agentName=`. */
export function useActivationOptions(agentName: string | undefined) {
  return useOnDemandList<ActivationOption>(async (signal) => {
    if (!agentName) return []
    const all: ActivationOption[] = []
    for (let page = 1; ; page++) {
      const params = new URLSearchParams({
        agentName,
        page: String(page),
        pageSize: String(ACTIVATION_PAGE_SIZE),
      })
      const res = await fetch(`/api/agent-activations?${params}`, { cache: 'no-store', signal })
      if (!res.ok) return readError(res, 'Couldn’t load activations')
      const data = await res.json()
      const rows: Array<{ name?: string; agentName?: string; isActive?: boolean }> = Array.isArray(
        data
      )
        ? data
        : (data?.activations ?? data?.data ?? [])
      for (const row of rows) {
        if (row.name) {
          all.push({ name: row.name, agentName: row.agentName ?? agentName, isActive: !!row.isActive })
        }
      }
      const pagination = data?.pagination
      const hasNext = pagination?.hasNext ?? (pagination?.totalPages ?? 1) > page
      if (!hasNext || rows.length === 0) break
    }
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }, 'Couldn’t load activations')
}

/**
 * Agent object id -> name for the secrets table. Stored secrets carry the
 * object id, so the deployments list is fetched once, and only when at least
 * one listed secret is agent- or activation-scoped.
 */
export function useAgentNameMap(secrets: TenantSecret[]): AgentNameMap {
  const [names, setNames] = useState<AgentNameMap>({})
  const needed = secrets.some((s) => !!s.agentId)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!needed || fetchedRef.current) return
    fetchedRef.current = true
    const controller = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/agent-deployments', { cache: 'no-store', signal: controller.signal })
        if (!res.ok) throw new Error('Failed to load agents')
        const data = await res.json()
        const agents: Array<{ id?: string; name?: string }> = Array.isArray(data?.agents)
          ? data.agents
          : []
        const map: AgentNameMap = {}
        for (const a of agents) if (a.id && a.name) map[a.id] = a.name
        setNames(map)
      } catch {
        if (!controller.signal.aborted) fetchedRef.current = false
      }
    })()
    return () => controller.abort()
  }, [needed])

  return names
}
