// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const { useWebhookDeliveries } = vi.hoisted(() => ({ useWebhookDeliveries: vi.fn() }))

vi.mock('../hooks/use-webhook-deliveries', () => ({ useWebhookDeliveries }))

import { DeliveriesCard } from './deliveries-card'

const reload = vi.fn()

function state(overrides: Record<string, unknown> = {}) {
  return { items: [], isLoading: false, error: null, reload, ...overrides }
}

describe('DeliveriesCard', () => {
  beforeEach(() => {
    useWebhookDeliveries.mockReset()
    reload.mockReset()
  })

  afterEach(cleanup)

  it('asks for the latest five deliveries and links each to the deliveries page', () => {
    useWebhookDeliveries.mockReturnValue(
      state({ items: [{ id: 'abc', requestId: 'request-1', receivedAt: new Date().toISOString(), bodyTruncated: false, headersTruncated: false }] })
    )

    render(<DeliveriesCard integrationId="hook-1" />)

    expect(useWebhookDeliveries).toHaveBeenCalledWith('hook-1', { pageSize: 5 })
    expect(screen.getByText('request-1').closest('a')!.getAttribute('href')).toBe(
      '/settings/connections/hook-1/deliveries?delivery=abc'
    )
    expect(screen.getByText('View all deliveries').closest('a')!.getAttribute('href')).toBe(
      '/settings/connections/hook-1/deliveries'
    )
  })

  it('shows the empty state without the link to all deliveries', () => {
    useWebhookDeliveries.mockReturnValue(state())

    render(<DeliveriesCard integrationId="hook-1" />)

    screen.getByText(/No deliveries yet/)
    expect(screen.queryByText('View all deliveries')).toBeNull()
  })

  it('shows a spinner while loading', () => {
    useWebhookDeliveries.mockReturnValue(state({ isLoading: true }))

    render(<DeliveriesCard integrationId="hook-1" />)

    screen.getByLabelText('Loading deliveries')
  })

  it('shows the error with a Retry that reloads', () => {
    useWebhookDeliveries.mockReturnValue(state({ error: 'Internal server error' }))

    render(<DeliveriesCard integrationId="hook-1" />)

    screen.getByText('Internal server error')
    fireEvent.click(screen.getByText('Retry'))
    expect(reload).toHaveBeenCalledOnce()
  })
})
