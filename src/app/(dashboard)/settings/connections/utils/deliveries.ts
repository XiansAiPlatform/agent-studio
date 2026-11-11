/**
 * Display helpers for webhook deliveries.
 */

import type { WebhookDeliveryHeader, WebhookDeliverySummary } from '../types'

/** The request id a row is labelled with. A redelivery shows the id of the delivery it repeats. */
export function deliveryLabel(item: Pick<WebhookDeliverySummary, 'requestId' | 'redeliveryOfRequestId'>): string {
  return item.redeliveryOfRequestId || item.requestId
}

/** Whether a delivery can be sent again as it was received. */
export function canBeRedelivered(item: Pick<WebhookDeliverySummary, 'bodyTruncated' | 'headersTruncated'>): boolean {
  return !item.bodyTruncated && !item.headersTruncated
}

/** "840 ms", "2.4 s" or "1 min 5 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`
  // Round before choosing the unit, so 9.96 s reads "10 s" and 59.6 s reads "1 min", not "60 s".
  const tenths = Math.round(ms / 100) / 10
  if (tenths < 10) return `${tenths.toFixed(1)} s`
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`
}

/** The webhook's Deliveries page, optionally opened at one delivery. */
export function deliveriesPageHref(integrationId: string, deliveryId?: string): string {
  const path = `/settings/connections/${encodeURIComponent(integrationId)}/deliveries`
  return deliveryId ? `${path}?${new URLSearchParams({ delivery: deliveryId })}` : path
}

/** Activity Logs for the workflow a delivery was sent to, including the workflows it started. */
export function workflowLogsHref(workflowId: string): string {
  return `/settings/logs?${new URLSearchParams({ workflowId, children: '1' })}`
}

/**
 * Request headers as pretty-printed JSON, in the order received. A header sent more than once
 * becomes an array of its values. Hidden (masked) values are shown as the server returned them.
 */
export function formatHeaders(headers: WebhookDeliveryHeader[]): string {
  const byName = new Map<string, string[]>()
  for (const header of headers) {
    const values = byName.get(header.name)
    if (values) values.push(header.value)
    else byName.set(header.name, [header.value])
  }
  const object = Object.fromEntries(
    [...byName].map(([name, values]) => [name, values.length === 1 ? values[0] : values])
  )
  return JSON.stringify(object, null, 2)
}

/** Bodies longer than this (in characters) are shown as received instead of pretty-printed. */
export const MAX_PRETTY_PRINT_CHARS = 2 * 1024 * 1024

/** How much of a payload is rendered until the viewer asks for all of it; Copy always copies everything. */
export const PAYLOAD_PREVIEW_CHARS = 256 * 1024

/** Payload shown in the delivery detail: pretty-printed when it is JSON, raw text otherwise. */
export function formatPayload(body: string, contentType: string): { text: string; isJson: boolean } {
  // Parsing and re-indenting a multi-megabyte body would block the page, so large ones are shown as received.
  const looksJson = body.length <= MAX_PRETTY_PRINT_CHARS && (/json/i.test(contentType) || /^\s*[[{]/.test(body))
  if (looksJson) {
    try {
      return { text: JSON.stringify(JSON.parse(body), null, 2), isJson: true }
    } catch {
      // Not valid JSON after all; show it as received.
    }
  }
  return { text: body, isJson: false }
}

/** Size of the payload as received, in UTF-8 bytes. Counted without copying a body that can be 16 MB. */
export function payloadBytes(body: string): number {
  let bytes = 0
  for (let i = 0; i < body.length; i++) {
    const code = body.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < body.length) {
      const next = body.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        // A surrogate pair is one 4-byte character.
        bytes += 4
        i++
      } else {
        bytes += 3
      }
    } else {
      // Other BMP characters, and a lone surrogate (encoded as U+FFFD), are 3 bytes.
      bytes += 3
    }
  }
  return bytes
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
