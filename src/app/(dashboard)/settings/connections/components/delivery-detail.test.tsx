// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WebhookDeliveryDetail } from '../types'

const { fetchWebhookDelivery, redeliverWebhookDelivery, showSuccessToast, showErrorToast } = vi.hoisted(() => ({
  fetchWebhookDelivery: vi.fn(),
  redeliverWebhookDelivery: vi.fn(),
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}))

vi.mock('../hooks/use-webhook-deliveries', async importOriginal => ({
  ...(await importOriginal<typeof import('../hooks/use-webhook-deliveries')>()),
  fetchWebhookDelivery,
  redeliverWebhookDelivery,
}))
vi.mock('@/lib/utils/error-handler', () => ({ showSuccessToast, showErrorToast }))

import { DeliveryDetail } from './delivery-detail'
import { PAYLOAD_PREVIEW_CHARS } from '../utils/deliveries'
import { RedeliveryError } from '../hooks/use-webhook-deliveries'

function detail(overrides: Partial<WebhookDeliveryDetail> = {}): WebhookDeliveryDetail {
  return {
    id: 'delivery-1',
    requestId: 'request-1',
    receivedAt: '2026-11-04T10:09:41Z',
    bodyTruncated: false,
    headersTruncated: false,
    integrationId: 'hook-1',
    contentType: 'application/json',
    headers: [
      { name: 'X-GitHub-Event', value: 'pull_request' },
      { name: 'Cookie', value: '********', masked: true },
    ],
    body: '{"action":"opened"}',
    workflowId: 'tenant:agent:Integrator Workflow:activation',
    ...overrides,
  }
}

const renderDetail = () => render(<DeliveryDetail integrationId="hook-1" deliveryId="delivery-1" />)

describe('DeliveryDetail', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    fetchWebhookDelivery.mockReset()
    redeliverWebhookDelivery.mockReset()
    showSuccessToast.mockReset()
    showErrorToast.mockReset()
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  afterEach(cleanup)

  it('shows the headers and payload as JSON with the hidden count and a link to the workflow', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail())

    renderDetail()

    await screen.findByText('1 hidden')
    screen.getByText('2 headers')
    const blocks = document.querySelectorAll('pre')
    expect(JSON.parse(blocks[0].textContent!)).toEqual({ 'X-GitHub-Event': 'pull_request', Cookie: '********' })
    expect(blocks[1].textContent).toBe('{\n  "action": "opened"\n}')
    expect(screen.getByText('Logs').closest('a')!.getAttribute('href')).toBe(
      '/settings/logs?workflowId=tenant%3Aagent%3AIntegrator+Workflow%3Aactivation&children=1'
    )
    expect(fetchWebhookDelivery).toHaveBeenCalledWith('hook-1', 'delivery-1', expect.any(AbortSignal))
  })

  it('warns when the payload or headers were truncated', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail({ bodyTruncated: true, headersTruncated: true }))

    renderDetail()

    await screen.findByText(/payload was over 16 MB/)
    screen.getByText(/headers were over 16 KB/)
  })

  it('shows an empty payload and no headers', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail({ headers: [], body: '' }))

    renderDetail()

    await screen.findByText('Empty payload.')
    screen.getByText('No headers were recorded.')
  })

  it('shows the error and loads again on Retry', async () => {
    fetchWebhookDelivery.mockRejectedValueOnce(new Error('Incoming call not found')).mockResolvedValueOnce(detail())

    renderDetail()

    fireEvent.click(await screen.findByText('Retry'))

    await screen.findByText('1 hidden')
    expect(fetchWebhookDelivery).toHaveBeenCalledTimes(2)
  })

  it('copies the full payload and reports success', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail())
    writeText.mockResolvedValue(undefined)

    renderDetail()
    await screen.findByText('1 hidden')
    fireEvent.click(screen.getAllByText('Copy')[1])

    await waitFor(() => expect(showSuccessToast).toHaveBeenCalledWith('Payload copied to clipboard'))
    expect(writeText).toHaveBeenCalledWith('{"action":"opened"}')
  })

  it('reports a copy the browser refused instead of claiming success', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail())
    writeText.mockRejectedValue(new Error('denied'))

    renderDetail()
    await screen.findByText('1 hidden')
    fireEvent.click(screen.getAllByText('Copy')[0])

    await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith(expect.any(Error), 'Could not copy the headers'))
    expect(showSuccessToast).not.toHaveBeenCalled()
  })

  it('renders a preview of a large payload until asked for all of it', async () => {
    const body = 'x'.repeat(PAYLOAD_PREVIEW_CHARS + 10)
    fetchWebhookDelivery.mockResolvedValue(detail({ body, contentType: 'text/plain' }))

    renderDetail()

    fireEvent.click(await screen.findByText(/Show full payload/))

    await waitFor(() => expect(document.querySelectorAll('pre')[1].textContent).toHaveLength(body.length))
    expect(screen.queryByText(/Show full payload/)).toBeNull()
  })

  it('shows the preview length before the full payload is requested', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail({ body: 'x'.repeat(PAYLOAD_PREVIEW_CHARS + 10), contentType: 'text/plain' }))

    renderDetail()

    await screen.findByText(/Show full payload/)
    expect(document.querySelectorAll('pre')[1].textContent).toHaveLength(PAYLOAD_PREVIEW_CHARS)
  })

  describe('redeliver', () => {
    const onRedelivered = vi.fn()
    const onRedeliveryUncertain = vi.fn()
    const renderWith = (canRedeliver: boolean) =>
      render(
        <DeliveryDetail
          integrationId="hook-1"
          deliveryId="delivery-1"
          canRedeliver={canRedeliver}
          onRedelivered={onRedelivered}
          onRedeliveryUncertain={onRedeliveryUncertain}
        />
      )

    beforeEach(() => {
      onRedelivered.mockReset()
      onRedeliveryUncertain.mockReset()
    })

    it('shows nothing about redelivery to users without the capability', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail())

      renderWith(false)

      await screen.findByText('Logs')
      expect(screen.queryByText(/Redeliver/)).toBeNull()
    })

    it('is disabled for a delivery stored truncated', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail({ bodyTruncated: true }))

      renderWith(true)

      const button = await screen.findByRole('button', { name: /Redeliver/ })
      expect(button).toHaveProperty('disabled', true)
      fireEvent.click(button)
      expect(screen.queryByText('Redeliver this webhook?')).toBeNull()
    })

    it('is disabled for a delivery whose headers were stored truncated', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail({ headersTruncated: true }))

      renderWith(true)

      const button = await screen.findByRole('button', { name: /Redeliver/ })
      expect(button).toHaveProperty('disabled', true)
      fireEvent.click(button)
      expect(screen.queryByText('Redeliver this webhook?')).toBeNull()
    })

    it('stops waiting when closed mid-redelivery, without updating or toasting', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail())
      let signal: AbortSignal | undefined
      redeliverWebhookDelivery.mockImplementation(
        (_i: string, _d: string, s: AbortSignal) =>
          new Promise((_resolve, reject) => {
            signal = s
            s.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          })
      )

      const { unmount } = renderWith(true)
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver/ }))
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver now/ }))
      await waitFor(() => expect(signal).toBeDefined())

      unmount()
      await Promise.resolve()

      expect(signal?.aborted).toBe(true)
      expect(showErrorToast).not.toHaveBeenCalled()
      expect(onRedeliveryUncertain).not.toHaveBeenCalled()
    })

    it('asks for confirmation, then redelivers and reports the answer', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail())
      const result = { deliveryId: 'delivery-2', redeliveryOf: 'delivery-1', statusCode: 200, durationMs: 2400 }
      redeliverWebhookDelivery.mockResolvedValue(result)

      renderWith(true)
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver/ }))

      await screen.findByText('Redeliver this webhook?')
      screen.getByText('Developer only')
      screen.getByText('X-Xians-Redelivery-Of: delivery-1')
      expect(redeliverWebhookDelivery).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: /Redeliver now/ }))

      await waitFor(() => expect(onRedelivered).toHaveBeenCalledWith(result))
      expect(redeliverWebhookDelivery).toHaveBeenCalledWith('hook-1', 'delivery-1', expect.any(AbortSignal))
      expect(showSuccessToast).toHaveBeenCalledWith('Redelivered · answered 200 in 2.4 s')
      await waitFor(() => expect(screen.queryByText('Redeliver this webhook?')).toBeNull())
    })

    it('reports a call the webhook turned away without treating it as a new delivery', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail())
      redeliverWebhookDelivery.mockResolvedValue({ deliveryId: null, redeliveryOf: 'delivery-1', statusCode: 401, durationMs: 30 })

      renderWith(true)
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver/ }))
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver now/ }))

      await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith(expect.any(Error), 'Redelivery was rejected'))
      expect(onRedelivered).not.toHaveBeenCalled()
      expect(showSuccessToast).not.toHaveBeenCalled()
    })

    it('reports a refused redelivery, which sent nothing', async () => {
      fetchWebhookDelivery.mockResolvedValue(detail())
      redeliverWebhookDelivery.mockRejectedValue(new RedeliveryError('This call is already being redelivered', 409))

      renderWith(true)
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver/ }))
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver now/ }))

      await waitFor(() => expect(showErrorToast).toHaveBeenCalledWith(expect.any(Error), 'Could not redeliver'))
      expect(onRedelivered).not.toHaveBeenCalled()
      expect(onRedeliveryUncertain).not.toHaveBeenCalled()
    })

    it.each([
      ['a timeout', 408],
      ['a gateway timeout', 504],
      ['no answer at all', null],
    ])('after %s, says the call may have been sent and refreshes the list', async (_, status) => {
      fetchWebhookDelivery.mockResolvedValue(detail())
      redeliverWebhookDelivery.mockRejectedValue(new RedeliveryError('failed', status))

      renderWith(true)
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver/ }))
      fireEvent.click(await screen.findByRole('button', { name: /Redeliver now/ }))

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(expect.any(Error), 'Could not confirm the redelivery')
      )
      expect(onRedeliveryUncertain).toHaveBeenCalledOnce()
      expect(onRedelivered).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.queryByText('Redeliver this webhook?')).toBeNull())
    })

    it('shows who triggered a redelivery and what it repeats', async () => {
      fetchWebhookDelivery.mockResolvedValue(
        detail({ redeliveryOf: 'delivery-0', redeliveryOfRequestId: 'request-0', triggeredBy: 'dev@example.com' })
      )

      renderWith(true)

      await screen.findByText('Redelivery of')
      screen.getByText('request-0')
      screen.getByText('dev@example.com')
    })
  })
})
