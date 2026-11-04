import { describe, expect, it, vi } from 'vitest'
import {
  agentHasActivation,
  MAX_PAGES,
  resolveAgentNameById,
  type TenantGetClient,
} from './secret-agent-scope'

const fakeClient = (pages: unknown[]) => {
  const get = vi.fn()
  pages.forEach((page) => get.mockResolvedValueOnce(page))
  return { get } as unknown as TenantGetClient & { get: ReturnType<typeof vi.fn> }
}

describe('agentHasActivation', () => {
  it('returns true when the agent has an activation with that exact name', async () => {
    const client = fakeClient([
      { activations: [{ name: 'prod-eu' }, { name: 'staging' }], pagination: { hasNext: false } },
    ])
    await expect(agentHasActivation(client, 't1', 'compello', 'staging')).resolves.toBe(true)
    expect(client.get.mock.calls[0][0]).toContain('agentActivations?agentName=compello')
  })

  it('returns false when no activation of the agent has that name', async () => {
    const client = fakeClient([{ activations: [{ name: 'prod-eu' }], pagination: { hasNext: false } }])
    await expect(agentHasActivation(client, 't1', 'compello', 'other-agent-activation')).resolves.toBe(
      false
    )
  })

  it('does not match on a partial name', async () => {
    const client = fakeClient([{ activations: [{ name: 'prod-eu' }], pagination: { hasNext: false } }])
    await expect(agentHasActivation(client, 't1', 'compello', 'prod')).resolves.toBe(false)
  })

  it('pages until the activation is found', async () => {
    const client = fakeClient([
      { activations: [{ name: 'a' }], pagination: { hasNext: true } },
      { activations: [{ name: 'b' }], pagination: { hasNext: false } },
    ])
    await expect(agentHasActivation(client, 't1', 'compello', 'b')).resolves.toBe(true)
    expect(client.get).toHaveBeenCalledTimes(2)
  })

  it('matches when the backend returns a bare array', async () => {
    const client = fakeClient([[{ name: 'prod-eu' }, { name: 'staging' }]])
    await expect(agentHasActivation(client, 't1', 'compello', 'staging')).resolves.toBe(true)
  })

  it('matches when the rows are under an items key', async () => {
    const client = fakeClient([{ items: [{ name: 'staging' }], pagination: { hasNext: false } }])
    await expect(agentHasActivation(client, 't1', 'compello', 'staging')).resolves.toBe(true)
  })

  it('matches a name containing spaces and a dash', async () => {
    const client = fakeClient([
      { activations: [{ name: 'MyFirstAgent - Nice Opossum' }], pagination: { hasNext: false } },
    ])
    await expect(
      agentHasActivation(client, 't1', 'MyFirstAgent', 'MyFirstAgent - Nice Opossum')
    ).resolves.toBe(true)
  })

  it('returns false for an unrecognised response without throwing', async () => {
    const client = fakeClient([{ unexpected: true }])
    await expect(agentHasActivation(client, 't1', 'compello', 'x')).resolves.toBe(false)
    const nullClient = fakeClient([null])
    await expect(agentHasActivation(nullClient, 't1', 'compello', 'x')).resolves.toBe(false)
  })

  it('stops on an empty page', async () => {
    const client = fakeClient([{ activations: [], pagination: { hasNext: true } }])
    await expect(agentHasActivation(client, 't1', 'compello', 'x')).resolves.toBe(false)
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it('stops after the page cap when the backend always reports another page', async () => {
    const get = vi.fn().mockResolvedValue({
      activations: [{ name: 'other' }],
      pagination: { hasNext: true },
    })
    await expect(
      agentHasActivation({ get } as unknown as TenantGetClient, 't1', 'compello', 'x')
    ).resolves.toBe(false)
    expect(get).toHaveBeenCalledTimes(MAX_PAGES)
  })

  it('keeps paging a full page when the response has no pagination info', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ name: `a${i}` }))
    const client = fakeClient([{ activations: full }, { activations: [{ name: 'target' }] }])
    await expect(agentHasActivation(client, 't1', 'compello', 'target')).resolves.toBe(true)
  })
})

describe('resolveAgentNameById', () => {
  const page = { agents: [{ id: 'abc', name: 'compello' }], pagination: { hasNext: false } }

  it('returns the agent name for an object id, or null when absent', async () => {
    await expect(resolveAgentNameById(fakeClient([page]), 't1', 'abc')).resolves.toBe('compello')
    await expect(resolveAgentNameById(fakeClient([page]), 't1', 'zzz')).resolves.toBeNull()
  })

  it('stops after the page cap', async () => {
    const get = vi.fn().mockResolvedValue({ agents: [], pagination: { hasNext: true } })
    await expect(
      resolveAgentNameById({ get } as unknown as TenantGetClient, 't1', 'abc')
    ).resolves.toBeNull()
    expect(get).toHaveBeenCalledTimes(MAX_PAGES)
  })
})
