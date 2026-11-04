/**
 * Display helpers for webhook deliveries.
 */

import type { WebhookDeliveryHeader } from '../types'

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

/** Payload shown in the delivery detail: pretty-printed when it is JSON, raw text otherwise. */
export function formatPayload(body: string, contentType: string): { text: string; isJson: boolean } {
  const looksJson = /json/i.test(contentType) || /^\s*[[{]/.test(body)
  if (looksJson) {
    try {
      return { text: JSON.stringify(JSON.parse(body), null, 2), isJson: true }
    } catch {
      // Not valid JSON after all; show it as received.
    }
  }
  return { text: body, isJson: false }
}

/** Size of the payload as received, in UTF-8 bytes. */
export function payloadBytes(body: string): number {
  return new TextEncoder().encode(body).length
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
