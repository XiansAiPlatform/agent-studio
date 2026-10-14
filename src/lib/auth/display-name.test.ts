import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()

vi.mock('@/lib/xians/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/xians/client')>(
    '@/lib/xians/client'
  )
  return {
    ...actual,
    createXiansClient: () => ({ get }),
  }
})

import { XiansApiError } from '@/lib/xians/client'

import {
  applyStoredDisplayName,
  chooseDisplayName,
  classifyStoredName,
  rememberProviderName,
  type DisplayNameToken,
} from './display-name'

describe('chooseDisplayName', () => {
  it('uses the stored name when one is set', () => {
    expect(
      chooseDisplayName({
        storedName: 'Stored Display Name',
        providerName: 'admin',
        email: 'admin@localhost.local',
      })
    ).toBe('Stored Display Name')
  })

  it('falls back to the provider name when the stored name is blank', () => {
    expect(
      chooseDisplayName({
        storedName: '  ',
        providerName: 'IdP Display Name',
        email: 'user@example.com',
      })
    ).toBe('IdP Display Name')
  })

  it('falls back to the email when no name is available', () => {
    expect(
      chooseDisplayName({
        storedName: null,
        providerName: '',
        email: 'admin@localhost.local',
      })
    ).toBe('admin@localhost.local')
  })
})

describe('classifyStoredName', () => {
  const users = [
    { email: 'Admin@Localhost.Local', name: 'Stored Display Name' },
    { email: 'jane@localhost.local', name: 'Jane' },
    { email: 'admin@localhost.local.extra', name: 'Not Admin' },
  ]

  it('matches the email exactly, ignoring case', () => {
    expect(classifyStoredName(users, 'admin@localhost.local')).toEqual({
      status: 'found',
      name: 'Stored Display Name',
    })
  })

  it('does not treat a partial search hit as the same account', () => {
    expect(classifyStoredName(users, 'admin@localhost.local.extra')).toEqual({
      status: 'found',
      name: 'Not Admin',
    })
    expect(classifyStoredName([{ email: 'admin@localhost.local.extra', name: 'Not Admin' }], 'admin@localhost.local')).toEqual({
      status: 'fallback',
    })
  })

  it('leaves the name unchanged when two accounts share an email', () => {
    expect(
      classifyStoredName(
        [
          { email: 'duplicate@example.com', name: 'Stored Alias' },
          { email: 'duplicate@example.com', name: 'Other Stored' },
        ],
        'duplicate@example.com'
      )
    ).toEqual({ status: 'unchanged' })
  })

  it('falls back when the stored name is empty', () => {
    expect(
      classifyStoredName([{ email: 'admin@localhost.local', name: '  ' }], 'admin@localhost.local')
    ).toEqual({ status: 'fallback' })
  })
})

describe('applyStoredDisplayName', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('replaces the provider name with the stored name and remembers the provider name', async () => {
    get.mockResolvedValue({
      users: [{ email: 'admin@localhost.local', name: 'Stored Display Name' }],
    })
    const token: DisplayNameToken = {
      name: 'admin',
      email: 'admin@localhost.local',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('Stored Display Name')
    expect(token.providerName).toBe('admin')
    expect(String(get.mock.calls[0]?.[0])).toContain(
      'search=admin%40localhost.local'
    )
  })

  it('restores the provider name when the stored name is later cleared', async () => {
    const token: DisplayNameToken = {
      name: 'Stored Display Name',
      email: 'admin@localhost.local',
      providerName: 'admin',
    }
    get.mockResolvedValue({
      users: [{ email: 'admin@localhost.local', name: '' }],
    })

    await applyStoredDisplayName(token)

    expect(token.name).toBe('admin')
    expect(token.providerName).toBe('admin')
  })

  it('does not adopt a stored name when the email matches more than one account', async () => {
    get.mockResolvedValue({
      users: [
        { email: 'duplicate@example.com', name: 'Stored Alias' },
        { email: 'duplicate@example.com', name: 'Other Stored' },
      ],
    })
    const token: DisplayNameToken = {
      name: 'IdP Display Name',
      email: 'duplicate@example.com',
    }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('IdP Display Name')
  })

  it('uses the account whose id is the email when search does not return it', async () => {
    get
      .mockResolvedValueOnce({ users: [] })
      .mockResolvedValueOnce({ email: 'admin@localhost.local', name: 'Stored Display Name' })
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('Stored Display Name')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('keeps the provider name when the account has no stored record', async () => {
    get
      .mockResolvedValueOnce({ users: [] })
      .mockRejectedValueOnce(new XiansApiError('missing', 404))
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await applyStoredDisplayName(token)

    expect(token.name).toBe('admin')
  })

  it('keeps the current name when the directory lookup fails', async () => {
    get.mockRejectedValue(new Error('offline'))
    const token: DisplayNameToken = { name: 'admin', email: 'admin@localhost.local' }

    await expect(applyStoredDisplayName(token)).rejects.toThrow('offline')
    expect(token.name).toBe('admin')
  })
})

describe('rememberProviderName', () => {
  it('does not replace a captured provider name with the stored name', () => {
    const token: DisplayNameToken = {
      name: 'Stored Display Name',
      providerName: 'admin',
    }
    rememberProviderName(token)
    expect(token.providerName).toBe('admin')
  })
})
