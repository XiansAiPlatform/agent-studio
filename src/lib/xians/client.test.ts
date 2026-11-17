import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./on-behalf-of', () => ({ applyOnBehalfOfHeader: vi.fn(), getOnBehalfOf: vi.fn() }))

import { XiansClient } from './client'

describe('XiansClient request timeout', () => {
  const fetchMock = vi.fn()
  let timeoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    delete process.env.XIANS_REQUEST_TIMEOUT_MS
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    timeoutSpy.mockRestore()
  })

  const client = () => new XiansClient({ baseUrl: 'http://xians.test', apiKey: 'key' })

  it('uses the per-call timeout when one is given', async () => {
    await client().post('/api/thing', undefined, { timeoutMs: 295_000 })

    expect(timeoutSpy).toHaveBeenCalledWith(295_000)
    // The option is the client's own and is not passed on to fetch.
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('timeoutMs')
  })

  it('uses the 5 s default otherwise', async () => {
    await client().post('/api/thing')

    expect(timeoutSpy).toHaveBeenCalledWith(5_000)
  })
})
