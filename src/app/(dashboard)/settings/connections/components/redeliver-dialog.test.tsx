// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RedeliverDialog } from './redeliver-dialog'
import type { WebhookDeliveryDetail } from '../types'

const delivery = {
  id: 'delivery-1',
  requestId: 'request-1',
  receivedAt: '2026-11-04T10:09:41.000Z',
} as WebhookDeliveryDetail

function renderDialog(isSending: boolean) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  render(
    <RedeliverDialog open onOpenChange={onOpenChange} delivery={delivery} onConfirm={onConfirm} isSending={isSending} />
  )
  return { onOpenChange, onConfirm }
}

describe('RedeliverDialog', () => {
  afterEach(cleanup)

  it('confirms without closing itself, so the caller closes it once the webhook answers', () => {
    const { onOpenChange, onConfirm } = renderDialog(false)

    fireEvent.click(screen.getByRole('button', { name: /Redeliver now/ }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('cannot be closed or confirmed again while sending', () => {
    const { onOpenChange, onConfirm } = renderDialog(true)

    const action = screen.getByRole('button', { name: /Redelivering/ })
    expect(action).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    fireEvent.click(action)

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('can be cancelled when not sending', () => {
    const { onOpenChange } = renderDialog(false)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
