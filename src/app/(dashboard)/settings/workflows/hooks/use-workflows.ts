'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { useResolvedLoading } from '@/hooks/use-resolved-loading'
import { PaginatedWorkflows, WorkflowExecution } from '../types'

export interface UseWorkflowsOptions {
  agentName?: string
  activationName?: string
  status?: string
  workflowType?: string
  user?: string
  pageSize?: number
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new Error((body as { error?: string }).error || fallback)
}

async function fetchWorkflowsPage(
  options: UseWorkflowsOptions,
  pageToken?: string | null
): Promise<PaginatedWorkflows> {
  if (!options.agentName || !options.activationName) {
    return { workflows: [], pageSize: options.pageSize ?? 20, hasNextPage: false }
  }

  const params = new URLSearchParams()
  params.set('agentName', options.agentName)
  params.set('activationName', options.activationName)
  if (options.status && options.status !== 'all') params.set('status', options.status)
  if (options.workflowType) params.set('workflowType', options.workflowType)
  if (options.user) params.set('user', options.user)
  params.set('pageSize', String(options.pageSize ?? 20))
  if (pageToken) params.set('pageToken', pageToken)

  const response = await fetch(`/api/workflows?${params.toString()}`)
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

export function useWorkflows(options: UseWorkflowsOptions) {
  const { currentTenantId } = useTenant()
  const [workflows, setWorkflows] = useState<WorkflowExecution[] | undefined>(undefined)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
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

  const load = useCallback(async () => {
    if (!options.agentName || !options.activationName) {
      setWorkflows(undefined)
      setNextPageToken(null)
      setHasNextPage(false)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setError(null)

    try {
      const page = await fetchWorkflowsPage(options, null)
      setWorkflows(page.workflows)
      setNextPageToken(page.nextPageToken ?? null)
      setHasNextPage(page.hasNextPage)
      resolve(optionsKey)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
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
    if (!hasNextPage || !nextPageToken) return
    const page = await fetchWorkflowsPage(options, nextPageToken)
    setWorkflows((prev) => [...(prev ?? []), ...page.workflows])
    setNextPageToken(page.nextPageToken ?? null)
    setHasNextPage(page.hasNextPage)
  }, [hasNextPage, nextPageToken, options])

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
    nextPageToken,
    hasNextPage,
    isLoading,
    error,
    refetch: load,
    loadMore,
    cancelWorkflow,
  }
}
