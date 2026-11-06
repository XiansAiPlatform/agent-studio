import { describe, expect, it } from 'vitest'
import {
  MAX_PRETTY_PRINT_CHARS,
  deliveriesPageHref,
  deliveryRunWorkflowId,
  formatBytes,
  formatHeaders,
  formatPayload,
  payloadBytes,
  workflowLogsHref,
} from './deliveries'

describe('formatPayload', () => {
  it('pretty-prints JSON bodies', () => {
    expect(formatPayload('{"action":"opened","n":1}', 'application/json')).toEqual({
      text: '{\n  "action": "opened",\n  "n": 1\n}',
      isJson: true,
    })
  })

  it('recognises JSON sent without a JSON content type', () => {
    expect(formatPayload('[1,2]', 'text/plain').isJson).toBe(true)
  })

  it('shows a very large JSON body as received instead of re-indenting it', () => {
    const body = `[${'1,'.repeat(MAX_PRETTY_PRINT_CHARS / 2)}1]`

    expect(formatPayload(body, 'application/json')).toEqual({ text: body, isJson: false })
  })

  it('shows invalid JSON and other text as received', () => {
    expect(formatPayload('{not json', 'application/json')).toEqual({ text: '{not json', isJson: false })
    expect(formatPayload('payload=%7B%7D', 'application/x-www-form-urlencoded')).toEqual({
      text: 'payload=%7B%7D',
      isJson: false,
    })
  })
})

describe('formatHeaders', () => {
  it('shows headers as JSON in the order received, repeated ones as an array', () => {
    expect(
      formatHeaders([
        { name: 'X-GitHub-Event', value: 'pull_request' },
        { name: 'X-Forwarded-For', value: '10.0.0.1' },
        { name: 'Cookie', value: '********', masked: true },
        { name: 'X-Forwarded-For', value: '10.0.0.2' },
      ])
    ).toBe(
      JSON.stringify(
        { 'X-GitHub-Event': 'pull_request', 'X-Forwarded-For': ['10.0.0.1', '10.0.0.2'], Cookie: '********' },
        null,
        2
      )
    )
  })

  it('shows no headers as an empty object', () => {
    expect(formatHeaders([])).toBe('{}')
  })
})

describe('payload size', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(payloadBytes('ab€')).toBe(5)
  })

  it('counts the same bytes as the browser encoder, including emoji and lone surrogates', () => {
    for (const text of ['', 'é', '😀', 'a😀b', '\ud800', 'x\udc00y', '日本語']) {
      expect(payloadBytes(text)).toBe(new TextEncoder().encode(text).length)
    }
  })

  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(18_840)).toBe('18.4 KB')
    expect(formatBytes(16 * 1024 * 1024)).toBe('16.0 MB')
  })
})

describe('links', () => {
  it('opens the deliveries page, optionally at one delivery', () => {
    expect(deliveriesPageHref('hook-1')).toBe('/settings/connections/hook-1/deliveries')
    expect(deliveriesPageHref('hook-1', 'abc')).toBe('/settings/connections/hook-1/deliveries?delivery=abc')
  })

  it('opens the workflow in Activity Logs with its child workflows', () => {
    expect(workflowLogsHref('t:Agent One:Integrator Workflow:Raven')).toBe(
      '/settings/logs?workflowId=t%3AAgent+One%3AIntegrator+Workflow%3ARaven&children=1'
    )
  })
})

describe('deliveryRunWorkflowId', () => {
  it('builds the run ID from the receiving workflow, keeping its activation, and the request ID', () => {
    expect(
      deliveryRunWorkflowId(
        'test-diyanada:Xianix AI-DLC Agent Onboarding:Integrator Workflow:Xianix AI-DLC Agent Onboarding - Autonomous Raven',
        '97ebedb8-5d1b-4d62-ac48-f1eb4b2a0973'
      )
    ).toBe(
      'test-diyanada:Xianix AI-DLC Agent Onboarding:Processing Workflow:Xianix AI-DLC Agent Onboarding - Autonomous Raven:97ebedb8-5d1b-4d62-ac48-f1eb4b2a0973'
    )
  })

  it('builds the run ID for a receiving workflow without an activation', () => {
    expect(deliveryRunWorkflowId('t:Agent One:Integrator Workflow', 'req-1')).toBe('t:Agent One:Processing Workflow:req-1')
  })

  it.each([
    ['a receiving workflow ID of another shape', 'Integrator Workflow', 'req-1'],
    ['no request ID', 't:Agent One:Integrator Workflow:Raven', ''],
  ])('is null for %s', (_, workflowId, requestId) => {
    expect(deliveryRunWorkflowId(workflowId, requestId)).toBeNull()
  })
})
