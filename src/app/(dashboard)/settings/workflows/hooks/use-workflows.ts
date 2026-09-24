'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { useResolvedLoading } from '@/hooks/use-resolved-loading'
import {
  PaginatedWorkflows,
  WorkflowExecution,
  matchesWorkflowType,
} from '../types'

export interface UseWorkflowsOptions {
  agentName?: string
  activationName?: string
  status?: string
  workflowType?: string
  user?: string
  pageSize?: number
}

/**
 * Upper bound on upstream pages fetched per load/loadMore while topping up a
 * type-filtered page. Keeps a rare type from scanning the whole history.
 */
const MAX_PAGES_PER_FETCH = 10

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new Error((body as { error?: string }).error || fallback)
}

/**
 * The workflow type filter is intentionally not sent upstream: the Admin API
 * rejects values containing ':' and every Temporal workflow type is
 * `{agentName}:{flowName}`. Type filtering is applied client-side instead.
 */
async function fetchWorkflowsPage(
  options: UseWorkflowsOptions,
  pageToken: string | null,
  signal?: AbortSignal
): Promise<PaginatedWorkflows> {
  if (!options.agentName || !options.activationName) {
    return { workflows: [], pageSize: options.pageSize ?? 20, hasNextPage: false }
  }

  const params = new URLSearchParams()
  params.set('agentName', options.agentName)
  params.set('activationName', options.activationName)
  if (options.status && options.status !== 'all') params.set('status', options.status)
  if (options.user) params.set('user', options.user)
  params.set('pageSize', String(options.pageSize ?? 20))
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`/api/workflows?${params.toString()}`, { signal })
  if (!response.ok) {
    await parseError(response, `Failed to fetch workflows: ${response.statusText}`)
  }
  const data = await response.json()
  return {
    workflows: Array.isArray(data?.workflows) ? data.workflows : [],
    nextPageToken: data?.nextPageToken ?? null,
    pageSize: data?.pageSize ?? options.pageSize ?? 20,
    hasNextPage: Boolean(data?.hasNextPage),
    totalCount: data?.totalCount ?? null,
  }
}

/**
 * Fetches upstream pages starting at `pageToken` until a full page of rows
 * matching the type filter is collected, upstream runs out, or the page cap is hit.
 * Without a type filter this is exactly one upstream page.
 */
async function fetchMatchingPages(
  options: UseWorkflowsOptions,
  pageToken: string | null,
  signal: AbortSignal
): Promise<{ workflows: WorkflowExecution[]; nextPageToken: string | null; hasNextPage: boolean }> {
  const pageSize = options.pageSize ?? 20
  const collected: WorkflowExecution[] = []
  let matched = 0
  let token = pageToken
  let hasNextPage = false

  for (let i = 0; i < MAX_PAGES_PER_FETCH; i++) {
    const page = await fetchWorkflowsPage(options, token, signal)
    collected.push(...page.workflows)
    matched += page.workflows.filter((w) =>
      matchesWorkflowType(w, options.agentName ?? '', options.workflowType)
    ).length
    token = page.nextPageToken ?? null
    hasNextPage = page.hasNextPage && Boolean(token)
    if (!hasNextPage || matched >= pageSize) break
  }

  return { workflows: collected, nextPageToken: token, hasNextPage }
}

export function useWorkflows(options: UseWorkflowsOptions) {
  const { currentTenantId } = useTenant()
  // Every row fetched so far, before the client-side type filter.
  const [allWorkflows, setAllWorkflows] = useState<WorkflowExecution[] | undefined>(undefined)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        tenantId: currentTenantId,
        agentName: options.agentName,
        activationName: options.activationName,
        status: options.status,
        workflowType: options.workflowType,
        user: options.user,
        pageSize: options.pageSize ?? 20,
      }),
    [
      currentTenantId,
      options.agentName,
      options.activationName,
      options.status,
      options.workflowType,
      options.user,
      options.pageSize,
    ]
  )

  const enabled = Boolean(options.agentName && options.activationName)
  const { isLoading, resolve } = useResolvedLoading(enabled ? optionsKey : null, false)

  const workflows = useMemo(
    () =>
      allWorkflows?.filter((w) =>
        matchesWorkflowType(w, options.agentName ?? '', options.workflowType)
      ),
    [allWorkflows, options.agentName, options.workflowType]
  )

  const load = useCallback(async () => {
    abortRef.current?.abort()

    if (!options.agentName || !options.activationName) {
      setAllWorkflows(undefined)
      setNextPageToken(null)
      setHasNextPage(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setError(null)

    try {
      const result = await fetchMatchingPages(options, null, controller.signal)
      if (controller.signal.aborted) return
      setAllWorkflows(result.workflows)
      setNextPageToken(result.nextPageToken)
      setHasNextPage(result.hasNextPage)
      resolve(optionsKey)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err : new Error('Failed to fetch workflows'))
      resolve(optionsKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, resolve])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  const loadMore = useCallback(async () => {
    const controller = abortRef.current
    if (!controller || !hasNextPage || !nextPageToken || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const result = await fetchMatchingPages(options, nextPageToken, controller.signal)
      if (controller.signal.aborted) return
      setAllWorkflows((prev) => [...(prev ?? []), ...result.workflows])
      setNextPageToken(result.nextPageToken)
      setHasNextPage(result.hasNextPage)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err : new Error('Failed to fetch workflows'))
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasNextPage, nextPageToken, isLoadingMore, options])

  const cancelWorkflow = useCallback(
    async (workflowId: string, force: boolean) => {
      const response = await fetch('/api/workflows/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workflowId, force }),
      })
      if (!response.ok) {
        await parseError(
          response,
          force ? 'Failed to terminate workflow' : 'Failed to cancel workflow'
        )
      }
      await load()
    },
    [load]
  )

  return {
    workflows,
    allWorkflows,
    nextPageToken,
    hasNextPage,
    isLoading,
    isLoadingMore,
    error,
    refetch: load,
    loadMore,
    cancelWorkflow,
  }
}
