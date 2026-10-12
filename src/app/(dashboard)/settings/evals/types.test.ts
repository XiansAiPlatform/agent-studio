import { describe, expect, it } from 'vitest'
import {
  AgentEval,
  DEFAULT_FORM_VALUES,
  EvalFormValues,
  formatInterval,
  parseQueryParams,
  toEvalRequest,
  toFormValues,
} from './types'
import { validateEvalForm } from './validation'

function form(patch: Partial<EvalFormValues>): EvalFormValues {
  return { ...DEFAULT_FORM_VALUES, name: 'greets user', chatMessage: 'Hello', ...patch }
}

describe('toEvalRequest', () => {
  it('sends only the chat payload, dropping blank assertions', () => {
    const request = toEvalRequest(
      form({
        assertions: [
          { op: 'contains', value: ' hello ' },
          { op: 'notContains', value: '   ' },
        ],
      })
    )

    expect(request).toEqual({
      name: 'greets user',
      type: 'chat',
      enabled: true,
      intervalMinutes: 15,
      timeoutSeconds: 60,
      chat: { message: 'Hello', assertions: [{ op: 'contains', value: 'hello' }] },
    })
  })

  it('maps webhook fields, query params and status code', () => {
    const request = toEvalRequest(
      form({
        type: 'webhook',
        webhookWorkflowType: ' Inbound ',
        webhookMethodName: 'ticket-created',
        webhookQueryParams: 'source=health-check\n\nmode = test',
        webhookBody: '{"id":1}',
        webhookExpectedStatusCode: '202',
        assertions: [],
      })
    )

    expect(request.chat).toBeUndefined()
    expect(request.webhook).toEqual({
      workflowType: 'Inbound',
      methodName: 'ticket-created',
      queryParams: { source: 'health-check', mode: 'test' },
      body: '{"id":1}',
      expectedStatusCode: 202,
      assertions: [],
    })
  })

  it('omits the status code when left empty', () => {
    const request = toEvalRequest(
      form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookMethodName: 'ping', webhookExpectedStatusCode: '' })
    )
    expect(request.webhook).not.toHaveProperty('expectedStatusCode')
  })

  it('sends no timeout or assertions for schedule evals', () => {
    const request = toEvalRequest(form({ type: 'schedule', scheduleId: 'acme:nightly', requireLastRunSuccess: false }))

    expect(request).toEqual({
      name: 'greets user',
      type: 'schedule',
      enabled: true,
      intervalMinutes: 15,
      schedule: { scheduleId: 'acme:nightly', requireLastRunSuccess: false },
    })
  })
})

describe('toFormValues', () => {
  it('round-trips an existing webhook eval', () => {
    const existing: AgentEval = {
      id: '66f000000000000000000001',
      name: 'ticket hook',
      type: 'webhook',
      enabled: false,
      intervalMinutes: 30,
      timeoutSeconds: 20,
      webhook: {
        workflowType: 'Inbound',
        methodName: 'ticket-created',
        queryParams: { source: 'hc' },
        body: '{}',
        expectedStatusCode: 200,
        assertions: [{ op: 'notContains', value: 'error' }],
      },
      consecutiveFailures: 0,
      scheduleState: 'paused',
      createdBy: 'admin',
      createdAt: '2026-10-08T00:00:00Z',
    }

    const values = toFormValues(existing)
    expect(values.webhookQueryParams).toBe('source=hc')
    expect(values.webhookExpectedStatusCode).toBe('200')

    expect(toEvalRequest(values)).toEqual({
      name: 'ticket hook',
      type: 'webhook',
      enabled: false,
      intervalMinutes: 30,
      timeoutSeconds: 20,
      webhook: {
        workflowType: 'Inbound',
        methodName: 'ticket-created',
        queryParams: { source: 'hc' },
        body: '{}',
        expectedStatusCode: 200,
        assertions: [{ op: 'notContains', value: 'error' }],
      },
    })
  })
})

describe('parseQueryParams', () => {
  it('rejects a line without key=value', () => {
    expect(() => parseQueryParams('source')).toThrow(/key=value/)
  })
})

describe('formatInterval', () => {
  it('labels presets and custom intervals', () => {
    expect(formatInterval(60)).toBe('Every hour')
    expect(formatInterval(120)).toBe('Every 2 hours')
    expect(formatInterval(7)).toBe('Every 7 minutes')
  })
})

describe('validateEvalForm', () => {
  it('accepts a valid chat eval', () => {
    expect(validateEvalForm(form({}))).toEqual({})
  })

  it('enforces the 5 minute minimum interval', () => {
    expect(validateEvalForm(form({ intervalMinutes: 4 }))).toHaveProperty('intervalMinutes')
  })

  it('requires the type-specific fields', () => {
    expect(validateEvalForm(form({ chatMessage: '  ' }))).toHaveProperty('chatMessage')
    expect(validateEvalForm(form({ type: 'webhook' }))).toMatchObject({
      webhookWorkflowType: expect.any(String),
      webhookMethodName: expect.any(String),
    })
    expect(validateEvalForm(form({ type: 'schedule' }))).toHaveProperty('scheduleId')
  })

  it('rejects workflow names with an agent prefix', () => {
    expect(validateEvalForm(form({ chatWorkflowType: 'My Agent:Chat' }))).toHaveProperty('chatWorkflowType')
  })

  it('rejects credentials in webhook query params', () => {
    const errors = validateEvalForm(
      form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookMethodName: 'ping', webhookQueryParams: 'apikey=secret' })
    )
    expect(errors.webhookQueryParams).toMatch(/credentials/)
  })

  it('rejects an invalid status code', () => {
    const errors = validateEvalForm(
      form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookMethodName: 'ping', webhookExpectedStatusCode: '99' })
    )
    expect(errors).toHaveProperty('webhookExpectedStatusCode')
  })

  it('does not validate timeout for schedule evals', () => {
    expect(validateEvalForm(form({ type: 'schedule', scheduleId: 's', timeoutSeconds: NaN }))).toEqual({})
  })
})
