import { beforeEach, describe, expect, it, vi } from 'vitest'

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup }))

import { fetchExternalUrl, pinnedLookup } from './external-fetch'

describe('fetchExternalUrl', () => {
  beforeEach(() => lookup.mockReset())

  it('rejects a hostname that resolves to a private address', async () => {
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }])

    await expect(fetchExternalUrl('https://mcp.example.com')).rejects.toThrow(
      'URL host resolves to a private address'
    )
  })

  it('returns the pinned address in the requested DNS result shape', async () => {
    const result = await new Promise<string | object[]>((resolve, reject) => {
      pinnedLookup('203.0.113.10', 4)('example.com', { all: true }, (error, value) => {
        if (error) reject(error)
        else resolve(value)
      })
    })

    expect(result).toEqual([{ address: '203.0.113.10', family: 4 }])
  })
})
