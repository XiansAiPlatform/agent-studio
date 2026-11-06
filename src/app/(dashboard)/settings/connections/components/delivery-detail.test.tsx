// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { WebhookDeliveryDetail } from '../types'

const { fetchWebhookDelivery, showSuccessToast, showErrorToast } = vi.hoisted(() => ({
  fetchWebhookDelivery: vi.fn(),
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}))

vi.mock('../hooks/use-webhook-deliveries', () => ({ fetchWebhookDelivery }))
vi.mock('@/lib/utils/error-handler', () => ({ showSuccessToast, showErrorToast }))

import { DeliveryDetail } from './delivery-detail'
import { PAYLOAD_PREVIEW_CHARS } from '../utils/deliveries'

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
    showSuccessToast.mockReset()
    showErrorToast.mockReset()
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  afterEach(cleanup)

  it('shows the headers and payload as JSON with the hidden count and a link to the run', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail())

    renderDetail()

    await screen.findByText('1 hidden')
    screen.getByText('2 headers')
    const blocks = document.querySelectorAll('pre')
    expect(JSON.parse(blocks[0].textContent!)).toEqual({ 'X-GitHub-Event': 'pull_request', Cookie: '********' })
    expect(blocks[1].textContent).toBe('{\n  "action": "opened"\n}')
    expect(screen.getByText('Logs').closest('a')!.getAttribute('href')).toBe(
      '/settings/logs?workflowId=tenant%3Aagent%3AProcessing+Workflow%3Aactivation%3Arequest-1&children=1'
    )
    expect(fetchWebhookDelivery).toHaveBeenCalledWith('hook-1', 'delivery-1', expect.any(AbortSignal))
  })

  it('links to the receiving workflow when the run cannot be worked out', async () => {
    fetchWebhookDelivery.mockResolvedValue(detail({ requestId: '' }))

    renderDetail()

    expect((await screen.findByText('Logs')).closest('a')!.getAttribute('href')).toBe(
      '/settings/logs?workflowId=tenant%3Aagent%3AIntegrator+Workflow%3Aactivation&children=1'
    )
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
})
