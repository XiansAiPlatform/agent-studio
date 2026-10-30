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

  it('maps update-mode webhook fields, query params and status code', () => {
    const request = toEvalRequest(
      form({
        type: 'webhook',
        webhookMode: 'update',
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
      mode: 'update',
      workflowType: 'Inbound',
      methodName: 'ticket-created',
      queryParams: { source: 'health-check', mode: 'test' },
      body: '{"id":1}',
      expectedStatusCode: 202,
      assertions: [],
    })
  })

  it('sends the webhook name and no query params in builtin mode', () => {
    const request = toEvalRequest(
      form({
        type: 'webhook',
        webhookMode: 'builtin',
        webhookWorkflowType: 'Integrator Workflow',
        webhookName: ' ticket-created ',
        webhookMethodName: 'ignored',
        webhookQueryParams: 'ignored=1',
        webhookMaxResponseMs: '1500',
        assertions: [],
      })
    )

    expect(request.webhook).toEqual({
      mode: 'builtin',
      workflowType: 'Integrator Workflow',
      webhookName: 'ticket-created',
      queryParams: {},
      body: '',
      expectedStatusCode: 200,
      maxResponseMs: 1500,
      assertions: [],
    })
  })

  it('sends path and value per assertion type, dropping untouched rows', () => {
    const request = toEvalRequest(
      form({
        type: 'webhook',
        webhookWorkflowType: 'Integrator Workflow',
        webhookName: 'ping',
        assertions: [
          { op: 'jsonEquals', path: ' $.status ', value: ' ok ' },
          { op: 'jsonExists', path: '$.data', value: 'stale value' },
          { op: 'headerExists', path: 'X-Request-Id', value: '' },
          { op: 'jsonEquals', path: '', value: '' },
          { op: 'contains', path: 'ignored', value: 'hello' },
        ],
      })
    )

    expect(request.webhook?.assertions).toEqual([
      { op: 'jsonEquals', path: '$.status', value: 'ok' },
      { op: 'jsonExists', path: '$.data', value: '' },
      { op: 'headerExists', path: 'X-Request-Id', value: '' },
      { op: 'contains', value: 'hello' },
    ])
  })

  it('omits the status code when left empty', () => {
    const request = toEvalRequest(
      form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookName: 'ping', webhookExpectedStatusCode: '' })
    )
    expect(request.webhook).not.toHaveProperty('expectedStatusCode')
  })

  it('sends notify contacts only when some are selected', () => {
    expect(toEvalRequest(form({ notifyContactIds: ['c1', 'c2'] })).notifyContactIds).toEqual(['c1', 'c2'])
    expect(toEvalRequest(form({ notifyContactIds: [] }))).not.toHaveProperty('notifyContactIds')
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
  it('reads webhook evals stored before modes existed as update mode', () => {
    const legacy = {
      id: '66f000000000000000000002',
      name: 'old hook',
      type: 'webhook',
      enabled: true,
      intervalMinutes: 15,
      timeoutSeconds: 30,
      webhook: { workflowType: 'Inbound', methodName: 'ping', queryParams: {}, body: '', assertions: [] },
      consecutiveFailures: 0,
      scheduleState: 'active',
      createdBy: 'admin',
      createdAt: '2026-10-08T00:00:00Z',
    } satisfies AgentEval

    expect(toFormValues(legacy).webhookMode).toBe('update')
    expect(toFormValues(legacy).notifyContactIds).toEqual([])
    expect(toEvalRequest(toFormValues(legacy)).webhook).toMatchObject({ mode: 'update', methodName: 'ping' })
  })

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

    existing.notifyContactIds = ['66f000000000000000000010']
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
        mode: 'update',
        workflowType: 'Inbound',
        methodName: 'ticket-created',
        queryParams: { source: 'hc' },
        body: '{}',
        expectedStatusCode: 200,
        assertions: [{ op: 'notContains', value: 'error' }],
      },
      notifyContactIds: ['66f000000000000000000010'],
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
    expect(validateEvalForm(form({ type: 'webhook', webhookMode: 'builtin' }))).toMatchObject({
      webhookWorkflowType: expect.any(String),
      webhookName: expect.any(String),
    })
    expect(validateEvalForm(form({ type: 'webhook', webhookMode: 'update' }))).toMatchObject({
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
      form({ type: 'webhook', webhookMode: 'update', webhookWorkflowType: 'Inbound', webhookMethodName: 'ping', webhookQueryParams: 'apikey=secret' })
    )
    expect(errors.webhookQueryParams).toMatch(/credentials/)
  })

  it('checks max response time against the timeout', () => {
    const base = { type: 'webhook' as const, webhookWorkflowType: 'Inbound', webhookName: 'ping', timeoutSeconds: 10 }
    expect(validateEvalForm(form({ ...base, webhookMaxResponseMs: '2000' }))).toEqual({})
    expect(validateEvalForm(form({ ...base, webhookMaxResponseMs: '20000' }))).toHaveProperty('webhookMaxResponseMs')
  })

  it('validates JSON paths, header names and required values', () => {
    const webhook = (assertions: EvalFormValues['assertions']) =>
      validateEvalForm(form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookName: 'ping', assertions })).assertions

    expect(webhook([{ op: 'jsonEquals', path: '$.data.items[0].status', value: 'ok' }])).toBeUndefined()
    expect(webhook([{ op: 'jsonExists', path: 'data.status', value: '' }])).toMatch(/JSON path/)
    expect(webhook([{ op: 'jsonEquals', path: '$.status', value: '' }])).toMatch(/expected value/)
    expect(webhook([{ op: 'headerExists', path: 'Bad Header', value: '' }])).toMatch(/header name/)
  })

  it('rejects webhook-only checks on chat evals', () => {
    const errors = validateEvalForm(form({ assertions: [{ op: 'jsonEquals', path: '$.a', value: 'b' }] }))
    expect(errors.assertions).toMatch(/only available on webhook evals/)
  })

  it('rejects an invalid status code', () => {
    const errors = validateEvalForm(
      form({ type: 'webhook', webhookWorkflowType: 'Inbound', webhookMethodName: 'ping', webhookExpectedStatusCode: '99' })
    )
    expect(errors).toHaveProperty('webhookExpectedStatusCode')
  })

  it('limits notify contacts to 10', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `c${i}`)
    expect(validateEvalForm(form({ notifyContactIds: ids.slice(0, 10) }))).toEqual({})
    expect(validateEvalForm(form({ notifyContactIds: ids }))).toHaveProperty('notifyContactIds')
  })

  it('does not validate timeout for schedule evals', () => {
    expect(validateEvalForm(form({ type: 'schedule', scheduleId: 's', timeoutSeconds: NaN }))).toEqual({})
  })
})
