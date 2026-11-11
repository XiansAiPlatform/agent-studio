/**
 * Display helpers for webhook deliveries.
 */

import type { WebhookDeliveryHeader } from '../types'

/** The webhook's Deliveries page, optionally opened at one delivery. */
export function deliveriesPageHref(integrationId: string, deliveryId?: string): string {
  const path = `/settings/connections/${encodeURIComponent(integrationId)}/deliveries`
  return deliveryId ? `${path}?${new URLSearchParams({ delivery: deliveryId })}` : path
}

/** Activity Logs for a workflow, including the workflows it started. */
export function workflowLogsHref(workflowId: string): string {
  return `/settings/logs?${new URLSearchParams({ workflowId, children: '1' })}`
}

/** How long before a delivery arrived its logs are looked for, to allow for clock differences. */
export const DELIVERY_LOGS_LEAD_MS = 60_000

/** The earliest a delivery's logs can be: shortly before it arrived. Null for an unreadable time. */
export function deliveryLogsSince(receivedAt: string): string | null {
  const time = Date.parse(receivedAt)
  return Number.isNaN(time) ? null : new Date(time - DELIVERY_LOGS_LEAD_MS).toISOString()
}

/**
 * Activity Logs for one delivery: every log written while handling its request, in the receiving
 * workflow and in every run it started. Starts shortly before the delivery arrived, so the search
 * covers a small window instead of all of the tenant's logs.
 */
export function deliveryLogsHref(requestId: string, receivedAt: string): string {
  const query = new URLSearchParams({ requestId })
  const since = deliveryLogsSince(receivedAt)
  if (since) query.set('startDate', since)
  return `/settings/logs?${query}`
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
