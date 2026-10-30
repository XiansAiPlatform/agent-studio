// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

const { showErrorToast } = vi.hoisted(() => ({ showErrorToast: vi.fn() }))

vi.mock('@/hooks/use-tenant', () => ({
  useTenant: () => ({ currentTenantId: 'tenant-1' }),
}))

vi.mock('@/lib/utils/error-handler', () => ({
  showErrorToast,
  showSuccessToast: vi.fn(),
}))

import { IntegrationDetailsSheet } from './integration-details-sheet'

interface PendingFetch {
  resolve: (name: string) => Promise<void>
  reject: (error: Error) => Promise<void>
}

function integration(name: string) {
  return {
    id: name,
    tenantId: 'tenant-1',
    platformId: 'builtin_webhook',
    name,
    description: '',
    agentName: 'Agent',
    activationName: 'Activation',
    workflowId: 'workflow-1',
    webhookUrl: '',
    configuration: {},
    mappingConfig: {},
    secrets: {},
    isEnabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: 'user-1',
  }
}

describe('IntegrationDetailsSheet', () => {
  const pending = new Map<string, PendingFetch>()

  // The sheet stays mounted across cards, so the only thing that changes is integrationId.
  const sheet = (integrationId: string) => (
    <IntegrationDetailsSheet open onOpenChange={() => {}} integrationId={integrationId} />
  )

  function openAThenSwitchToB() {
    const { rerender } = render(sheet('a'))
    rerender(sheet('b'))
    return { a: pending.get('a')!, b: pending.get('b')! }
  }

  beforeEach(() => {
    pending.clear()
    showErrorToast.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const id = url.split('/').pop()!
        return new Promise(($resolve, $reject) => {
          pending.set(id, {
            resolve: name =>
              act(async () => {
                $resolve(new Response(JSON.stringify(integration(name)), { status: 200 }))
              }),
            reject: error =>
              act(async () => {
                $reject(error)
              }),
          })
        })
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps showing the current card when an earlier response arrives late', async () => {
    const { a, b } = openAThenSwitchToB()

    await b.resolve('Integration B')
    expect(await screen.findByRole('heading', { name: 'Integration B' })).toBeTruthy()

    await a.resolve('Integration A')
    expect(screen.queryByRole('heading', { name: 'Integration A' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Integration B' })).toBeTruthy()
    expect(screen.queryByText('Loading...')).toBeNull()
  })

  it('keeps loading when an earlier response arrives before the current one', async () => {
    const { a, b } = openAThenSwitchToB()

    await a.resolve('Integration A')
    expect(screen.queryByRole('heading', { name: 'Integration A' })).toBeNull()
    expect(screen.getByText('Loading...')).toBeTruthy()

    await b.resolve('Integration B')
    expect(await screen.findByRole('heading', { name: 'Integration B' })).toBeTruthy()
    expect(screen.queryByText('Loading...')).toBeNull()
  })

  it('ignores a late failure from an earlier card', async () => {
    const { a, b } = openAThenSwitchToB()

    await b.resolve('Integration B')
    await screen.findByRole('heading', { name: 'Integration B' })

    await a.reject(new Error('Request for A failed'))
    expect(showErrorToast).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Integration B' })).toBeTruthy()
  })
})
