import { describe, expect, it } from 'vitest'
import { deliveriesPageHref, formatBytes, formatHeaders, formatPayload, payloadBytes, workflowLogsHref } from './deliveries'

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

  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B')
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
